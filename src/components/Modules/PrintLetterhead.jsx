/** Membrete compartido para cotizaciones y reportes impresos de MAX Inversiones.
 * La marca es un activo estático de /public/assets/imagenes; no requiere BLOB en PostgreSQL.
 * Los reportes generales incluyen la marca de agua corporativa, sin pie de página.
 * Las cotizaciones mantienen únicamente el encabezado oficial.
 */
export default function PrintLetterhead({title, subtitle, children, notice, headerContent, reportWatermark = false}) {
  return (
    <section className={`gm-print-document gm-letterhead${reportWatermark ? " gm-letterhead--report" : ""}`} aria-label={title}>
      <div className="gm-letterhead__header" aria-hidden="true">
        <img src="/assets/imagenes/membrete-max-encabezado.png" alt="" />
      </div>
      {reportWatermark && <div className="gm-letterhead__watermark" aria-hidden="true">
        <img src="/assets/imagenes/logo-max-marca-agua.png" alt="" />
      </div>}
      <div className="gm-letterhead__body">
        {headerContent !== false && <div className="gm-letterhead__heading">
          {headerContent || <>
            <p className="gm-letterhead__eyebrow">MAX INVERSIONES · GEOMAX</p>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </>}
        </div>}
        {children}
        {notice && <p className="gm-letterhead__note">{notice}</p>}
      </div>
    </section>
  )
}
