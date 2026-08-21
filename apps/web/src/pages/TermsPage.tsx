import { LegalPageLayout } from "@/components/LegalPageLayout"

const sectionClassName = "flex flex-col gap-3"
const headingClassName = "text-lg font-semibold"
const listClassName = "list-disc space-y-2 pl-5 text-muted-foreground"

export function TermsPage() {
  return (
    <LegalPageLayout
      title="Conditions d’utilisation"
      description={(
        <>
          Dernière mise à jour : <time dateTime="2026-08-21">21 août 2026</time>
        </>
      )}
    >
      <section className={sectionClassName}>
        <h2 className={headingClassName}>1. Présentation du service</h2>
        <p className="text-muted-foreground">
          BetterIntra est un projet étudiant non officiel réalisé dans le cadre du
          cursus 42. Il propose un tableau de bord autour des données autorisées de
          l’Intra et des fonctionnalités sociales propres à BetterIntra. Le service
          n’est ni fourni, ni garanti, ni administré par 42.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>2. Accès et compte</h2>
        <ul className={listClassName}>
          <li>L’utilisateur doit fournir des informations exactes et protéger son mot de passe.</li>
          <li>Un compte ne doit pas être partagé avec une autre personne.</li>
          <li>
            L’accès aux données scolaires nécessite de lier volontairement un
            compte 42 grâce au protocole OAuth.
          </li>
          <li>
            L’utilisateur reste responsable des clés API créées depuis son compte
            et doit les révoquer en cas de divulgation.
          </li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>3. Règles de conduite</h2>
        <p className="text-muted-foreground">Il est interdit de :</p>
        <ul className={listClassName}>
          <li>harceler, menacer ou usurper l’identité d’un autre utilisateur ;</li>
          <li>publier un contenu illégal, trompeur ou portant atteinte aux droits d’autrui ;</li>
          <li>chercher à contourner l’authentification, les autorisations ou le rate limit ;</li>
          <li>extraire massivement des données ou perturber volontairement le service ;</li>
          <li>partager des secrets, jetons OAuth ou clés API appartenant à une autre personne.</li>
        </ul>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>4. Contenus et communications</h2>
        <p className="text-muted-foreground">
          L’utilisateur reste responsable de sa bio, de ses événements et de ses
          messages privés. Il accorde à BetterIntra les droits techniques strictement
          nécessaires pour stocker et afficher ces contenus dans le cadre du service.
          Les fonctions de blocage doivent être utilisées lorsqu’un échange devient
          indésirable.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>5. Données provenant de 42</h2>
        <p className="text-muted-foreground">
          Les informations affichées depuis l’Intra restent soumises à leur source.
          BetterIntra ne garantit pas qu’elles soient toujours disponibles, complètes
          ou immédiatement à jour. L’application ne doit pas être utilisée comme une
          source officielle pour une décision scolaire ou administrative.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>6. Disponibilité et modifications</h2>
        <p className="text-muted-foreground">
          Le service est fourni à des fins pédagogiques. Il peut être interrompu pour
          maintenance, correction ou indisponibilité d’un service tiers. L’équipe peut
          modifier une fonctionnalité lorsque cela est nécessaire à la sécurité, au
          respect du sujet ou au bon fonctionnement du projet.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>7. Suspension et suppression</h2>
        <p className="text-muted-foreground">
          Un accès peut être suspendu en cas d’abus, de tentative d’intrusion ou de
          violation de ces conditions. L’utilisateur peut demander la suppression de
          son compte et de ses données à l’équipe BetterIntra par le canal de contact
          communiqué avec le projet.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>8. Limitation de responsabilité</h2>
        <p className="text-muted-foreground">
          Dans les limites autorisées par la loi, l’équipe ne peut garantir une
          disponibilité permanente ni l’absence totale d’erreurs. Chaque utilisateur
          doit conserver ses propres informations importantes et signaler tout problème
          de sécurité sans l’exploiter.
        </p>
      </section>

      <section className={sectionClassName}>
        <h2 className={headingClassName}>9. Évolution des conditions</h2>
        <p className="text-muted-foreground">
          Ces conditions peuvent évoluer avec le projet. La poursuite de l’utilisation
          après publication d’une nouvelle version vaut acceptation des conditions mises
          à jour, dans le respect des règles applicables.
        </p>
      </section>
    </LegalPageLayout>
  )
}
