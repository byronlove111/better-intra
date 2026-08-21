import { LegalPageLayout } from "@/components/LegalPageLayout"

const sectionClassName = "flex flex-col gap-3"
const headingClassName = "text-lg font-semibold"
const listClassName = "list-disc space-y-2 pl-5 text-muted-foreground"

export function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      description={(
        <>
          Dernière mise à jour : <time dateTime="2026-08-21">21 août 2026</time>
        </>
      )}
    >
      <section className={sectionClassName}>
        <h2 className={headingClassName}>1. Objet de cette politique</h2>
        <p className="text-muted-foreground">
          BetterIntra est une application étudiante non officielle conçue dans le
          cadre du cursus 42. Cette politique explique quelles données sont
          utilisées, dans quel but et quels choix sont offerts aux utilisateurs.
          BetterIntra n’est ni édité ni administré par 42.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>2. Données traitées</h2>
        <ul className={listClassName}>
          <li>
            Données du compte local : adresse email, mot de passe conservé sous
            forme hachée, dates de création et de mise à jour.
          </li>
          <li>
            Données du compte 42 après autorisation OAuth : identifiant, login,
            nom d’affichage, avatar, campus, cursus, projets, évaluations,
            événements et temps de présence.
          </li>
          <li>
            Données BetterIntra : bio, abonnements, événements créés, messages
            privés, blocages et notifications.
          </li>
          <li>
            Données techniques : jetons de session, jeton OAuth 42 côté serveur
            et métadonnées des clés de l’API publique. Le secret complet d’une clé
            API n’est présenté qu’au moment de sa création.
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>3. Finalités</h2>
        <ul className={listClassName}>
          <li>Créer et sécuriser le compte BetterIntra.</li>
          <li>Afficher les informations scolaires autorisées par l’utilisateur.</li>
          <li>Fournir les profils, abonnements, événements, messages et notifications.</li>
          <li>Calculer et exporter les statistiques personnelles de Logtime.</li>
          <li>Protéger l’API publique grâce aux clés personnelles et à la limitation de débit.</li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>4. Origine et partage des données</h2>
        <p className="text-muted-foreground">
          Les données scolaires proviennent de l’API officielle 42 après accord
          explicite via OAuth. Les données sociales sont fournies directement par
          les utilisateurs et stockées dans la base PostgreSQL de BetterIntra.
          Elles ne sont pas vendues. Elles sont accessibles uniquement aux membres
          autorisés de l’équipe pour exploiter et maintenir le projet, ainsi qu’aux
          autres utilisateurs lorsque la fonctionnalité le prévoit, par exemple
          pour un profil, un événement ou un message privé.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>5. Conservation</h2>
        <p className="text-muted-foreground">
          Les notifications expirent automatiquement après sept jours. Les autres
          données sont conservées tant que le compte est utilisé ou jusqu’à une
          demande de suppression, sauf obligation technique ou légale contraire.
          La révocation de l’autorisation depuis le compte 42 empêche les futurs
          accès à l’API 42, mais ne supprime pas automatiquement le compte local.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>6. Sécurité</h2>
        <p className="text-muted-foreground">
          Les mots de passe sont hachés, les secrets OAuth restent côté serveur et
          les communications destinées à l’évaluation passent par HTTPS. Les jetons
          de session sont conservés dans le navigateur de l’utilisateur. Aucune
          mesure de sécurité ne pouvant supprimer tous les risques, les utilisateurs
          doivent protéger l’accès à leur appareil et ne jamais partager leurs
          jetons ou clés API.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>7. Vos droits</h2>
        <p className="text-muted-foreground">
          L’utilisateur peut demander l’accès, la rectification ou la suppression
          de ses données, ainsi que retirer son autorisation OAuth 42. La suppression
          complète du compte BetterIntra (jetons, clés API et données liées) est
          disponible depuis la page Profil via « Supprimer mes données ». Une
          vérification d’identité peut être demandée pour les demandes hors application
          afin d’éviter la suppression des données d’une autre personne.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>8. Évolution de cette politique</h2>
        <p className="text-muted-foreground">
          Cette politique peut évoluer avec les fonctionnalités du projet. La date
          affichée en haut de la page permet d’identifier la version applicable.
        </p>
      </section>
    </LegalPageLayout>
  )
}
