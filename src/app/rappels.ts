/**
 * Rappels : seulement ceux-ci, comme demandé.
 *  - le compte courant est au-delà du découvert autorisé ;
 *  - une échéance approche et le solde du compte courant (découvert compris) ne suffit pas ;
 *  - la dernière sauvegarde date de plus d'un mois.
 * Aucun rappel de saisie.
 */
import { alerteSolde, prochainesEcheances, situationCourant } from '../core/compta/calculs';
import { dateLisible, ecartJours, type DateISO } from '../core/dates';
import { formatEuros } from '../core/money';
import type { DonneesCompta } from '../core/compta/types';
import { ecrireReglage, type Reglages } from '../storage/reglages';

export interface Rappel {
  cle: string;
  titre: string;
  texte: string;
  ton: 'danger' | 'attention';
  chemin: string;
  /** Date à partir de laquelle le rappel est dû (pour la notification en arrière-plan). */
  aPartirDu: DateISO;
}

const JOURS_SAUVEGARDE = 30;
const JOURS_AVANT_ECHEANCE = 7;

function rappelSauvegarde(d: DonneesCompta, r: Reglages, auj: DateISO): Rappel | null {
  if (!d.postes.length && !d.operations.length) return null;
  const derniere = r.derniereSauvegarde;
  const aPartirDu = derniere ? ajouterJours(derniere, JOURS_SAUVEGARDE) : auj;
  return {
    cle: `sauvegarde-${aPartirDu}`,
    titre: 'Pense à sauvegarder',
    texte: derniere
      ? `Dernière sauvegarde le ${dateLisible(derniere)}. Un fichier suffit pour tout retrouver.`
      : 'Aucune sauvegarde pour l\'instant. Un fichier suffit pour tout retrouver si tu perds le téléphone.',
    ton: 'attention',
    chemin: '/reglages',
    aPartirDu,
  };
}

function ajouterJours(d: DateISO, n: number): DateISO {
  const t = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + n));
  return t.toISOString().slice(0, 10);
}

/** Rappels à afficher maintenant. */
export function rappelsActifs(d: DonneesCompta, r: Reglages, auj: DateISO): Rappel[] {
  const res: Rappel[] = [];
  const s = situationCourant(d, auj);
  if (s && s.decouvert > 0 && s.disponible < 0) {
    res.push({
      cle: `hors-decouvert-${auj.slice(0, 7)}`,
      titre: 'Au-delà du découvert autorisé',
      texte: `Le compte courant est à ${formatEuros(s.solde)}, soit ${formatEuros(-s.disponible)} de plus que le découvert autorisé (−${formatEuros(s.decouvert)}). Agios et frais plus élevés à prévoir.`,
      ton: 'danger',
      chemin: '/comptes',
      aPartirDu: auj,
    });
  }
  const a = alerteSolde(d, auj, JOURS_AVANT_ECHEANCE);
  // Déjà au-delà du découvert : le rappel ci-dessus suffit, toutes les échéances sont concernées.
  if (a && !(s && s.decouvert > 0 && s.disponible < 0)) {
    res.push({
      cle: `solde-${a.echeance.poste.id}-${a.echeance.date}`,
      titre: 'Solde insuffisant pour la prochaine échéance',
      texte: `${a.echeance.poste.libelle} (${dateLisible(a.echeance.date)}) : il faudra ${formatEuros(a.besoin)}, le compte courant a ${formatEuros(a.solde)}${a.disponible !== a.solde ? ` (${formatEuros(a.disponible)} découvert compris)` : ''}.`,
      ton: 'danger',
      chemin: '/comptes',
      aPartirDu: auj,
    });
  }
  const sv = rappelSauvegarde(d, r, auj);
  if (sv && sv.aPartirDu <= auj) res.push(sv);
  return res;
}

/**
 * Rappels futurs, enregistrés pour que le service worker puisse notifier même appli fermée
 * (quand Chrome l'autorise). Calculés avec le solde connu aujourd'hui.
 */
export function rappelsPlanifies(d: DonneesCompta, r: Reglages, auj: DateISO): Rappel[] {
  const res = [...rappelsActifs(d, r, auj)];
  const courant = situationCourant(d, auj);
  if (courant) {
    let besoin = 0;
    for (const e of prochainesEcheances(d, auj, 31)) {
      besoin += e.montant ?? 0;
      if (besoin > courant.disponible && ecartJours(auj, e.date) > JOURS_AVANT_ECHEANCE) {
        res.push({
          cle: `solde-${e.poste.id}-${e.date}`,
          titre: 'Échéance bientôt, solde à vérifier',
          texte: `${e.poste.libelle} le ${dateLisible(e.date)} : vérifie que le compte courant couvre ${formatEuros(besoin)}.`,
          ton: 'danger',
          chemin: '/comptes',
          aPartirDu: ajouterJours(e.date, -JOURS_AVANT_ECHEANCE),
        });
        break;
      }
    }
  }
  const s = rappelSauvegarde(d, r, auj);
  if (s && s.aPartirDu > auj) res.push(s);
  return res;
}

/** Envoie une notification système pour chaque rappel pas encore notifié. */
export async function notifier(d: DonneesCompta, r: Reglages, auj: DateISO): Promise<void> {
  await ecrireReglage('rappelsPlanifies', rappelsPlanifies(d, r, auj));
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return;
  const nouveaux = rappelsActifs(d, r, auj).filter((x) => !r.rappelsMontres.includes(x.cle));
  for (const x of nouveaux) {
    await reg.showNotification(x.titre, { body: x.texte, tag: x.cle, icon: 'icone-192.png', data: { chemin: x.chemin } });
  }
  if (nouveaux.length) await ecrireReglage('rappelsMontres', [...r.rappelsMontres, ...nouveaux.map((x) => x.cle)].slice(-50));
}

/** Demande l'autorisation des notifications et active la vérification en arrière-plan si possible. */
export async function activerNotifications(): Promise<'ok' | 'refuse' | 'indisponible'> {
  if (typeof Notification === 'undefined') return 'indisponible';
  const p = await Notification.requestPermission();
  if (p !== 'granted') return 'refuse';
  try {
    const reg = (await navigator.serviceWorker?.ready) as ServiceWorkerRegistration & {
      periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void> };
    };
    await reg?.periodicSync?.register('rappels', { minInterval: 12 * 60 * 60 * 1000 });
  } catch {
    // Chrome n'accorde la vérification en arrière-plan qu'aux applis installées : sans elle,
    // les rappels arrivent à l'ouverture de l'appli.
  }
  return 'ok';
}
