package com.confiancecoursier.backend.notify.service;

/**
 * Mise en page commune de tous les emails (notifications, code de vérification, réinitialisation).
 *
 * <ul>
 *   <li>En-tête : logo (image hébergée sur le site, {@code /img/email-logo.png}) + nom de marque en texte,
 *       pour rester lisible si le client mail bloque les images ;</li>
 *   <li>bouton d'action vers la plateforme, doublé d'un lien en clair ;</li>
 *   <li>pied de page avec le lien du site.</li>
 * </ul>
 * Tableaux et styles en ligne uniquement : c'est ce que les clients mail (Gmail, Outlook…) savent afficher.
 * Les paramètres {@code bodyHtml} et {@code noteHtml} sont du HTML déjà échappé par l'appelant.
 */
public final class EmailLayout {

    public static final String BRAND = "ConfianceCoursier";

    private EmailLayout() {}

    /**
     * @param siteUrl   adresse publique du site (ex. https://confiancecoursier.cm), sans « / » final
     * @param title     titre de l'email
     * @param bodyHtml  contenu principal (paragraphes HTML)
     * @param ctaLabel  libellé du bouton (null = pas de bouton)
     * @param ctaUrl    lien du bouton
     * @param noteHtml  petite mention sous le bouton (null = aucune)
     */
    public static String render(String siteUrl, String title, String bodyHtml,
                                String ctaLabel, String ctaUrl, String noteHtml) {
        String site = siteUrl == null ? "" : siteUrl.replaceAll("/+$", "");
        String cta = ctaLabel == null || ctaUrl == null ? "" : """
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                  <tr><td bgcolor="#123b32" style="border-radius:10px;">
                    <a href="%1$s" target="_blank"
                       style="display:inline-block;padding:14px 26px;color:#ffffff;font-weight:700;font-size:15px;
                              text-decoration:none;border-radius:10px;font-family:Inter,Arial,Helvetica,sans-serif;">%2$s</a>
                  </td></tr>
                </table>
                <p style="margin:0 0 4px;color:#56635c;font-size:12px;line-height:1.5;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
                </p>
                <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.5;">
                  <a href="%1$s" style="color:#17634f;">%1$s</a>
                </p>""".formatted(ctaUrl, ctaLabel);
        String note = noteHtml == null || noteHtml.isBlank() ? ""
                : "<p style=\"margin:20px 0 0;color:#56635c;font-size:12px;line-height:1.55;\">" + noteHtml + "</p>";
        String siteLabel = site.replaceFirst("^https?://", "");

        return """
                <!DOCTYPE html>
                <html lang="fr">
                  <head>
                    <meta charset="UTF-8"/>
                    <meta name="viewport" content="width=device-width, initial-scale=1"/>
                    <meta name="color-scheme" content="light"/>
                    <meta name="supported-color-schemes" content="light"/>
                    <title>%2$s</title>
                  </head>
                  <body style="margin:0;padding:0;background:#f5f7f4;font-family:Inter,Arial,Helvetica,sans-serif;">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f7f4;padding:28px 12px;">
                      <tr><td align="center">
                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                               style="max-width:480px;background:#ffffff;border:1px solid #e2e8e2;border-radius:16px;overflow:hidden;">
                          <tr><td bgcolor="#123b32" style="background:#123b32;padding:20px 26px;">
                            <a href="%1$s" target="_blank" style="text-decoration:none;">
                              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                                <td style="padding-right:12px;vertical-align:middle;">
                                  <img src="%1$s/img/email-logo.png" width="40" height="40" alt=""
                                       style="display:block;border:0;border-radius:11px;"/>
                                </td>
                                <td style="vertical-align:middle;color:#ffffff;font-size:19px;font-weight:800;letter-spacing:-0.03em;">%3$s</td>
                              </tr></table>
                            </a>
                          </td></tr>
                          <tr><td style="padding:28px 26px 30px;">
                            <h1 style="margin:0 0 14px;color:#15241f;font-size:21px;line-height:1.25;letter-spacing:-0.02em;">%2$s</h1>
                            <div style="color:#3d4a43;font-size:15px;line-height:1.6;">%4$s</div>
                            %5$s
                            %6$s
                          </td></tr>
                        </table>
                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;">
                          <tr><td style="padding:18px 8px 0;text-align:center;color:#56635c;font-size:12px;line-height:1.6;">
                            <a href="%1$s" target="_blank" style="color:#17634f;font-weight:700;text-decoration:none;">%7$s</a><br/>
                            %3$s — la course en toute confiance, partout au Cameroun.<br/>
                            Vous recevez cet email car vous avez un compte %3$s.
                          </td></tr>
                        </table>
                      </td></tr>
                    </table>
                  </body>
                </html>
                """.formatted(site, title, BRAND, bodyHtml, cta, note, siteLabel);
    }

    /** Paragraphe de contenu. */
    public static String p(String html) {
        return "<p style=\"margin:0 0 12px;\">" + html + "</p>";
    }
}
