import { useEffect } from 'react'
import { FileDown, Loader2, X } from 'lucide-react'
import { downloadBlob } from './downloadStyledPdf'

export function PdfPreviewModal({
  open,
  onClose,
  title,
  subtitle,
  filename,
  url,
  loading,
  error,
  onDownload,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  filename: string
  url: string | null
  loading: boolean
  error?: string | null
  onDownload?: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
      return
    }
    if (!url) return
    fetch(url)
      .then((r) => r.blob())
      .then((blob) => downloadBlob(blob, filename))
      .catch(() => window.alert('No se pudo descargar el PDF.'))
  }

  return (
    <dialog
      className="modal modal-open"
      aria-labelledby="visor-pdf-titulo"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="modal-box visor-pdf flex flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-base-300 px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h3 id="visor-pdf-titulo" className="text-lg font-semibold">
              {title}
            </h3>
            {subtitle ? <p className="truncate text-sm text-base-content/60">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-ghost btn-square shrink-0"
            aria-label="Cerrar visor PDF"
            autoFocus
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="visor-pdf-body relative bg-base-200/70">
          {loading ? (
            <div className="flex flex-1 min-h-[70vh] flex-col items-center justify-center gap-3 text-sm text-base-content/65">
              <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              <p>Generando PDF… puede tardar unos segundos.</p>
            </div>
          ) : error ? (
            <div className="p-6">
              <div role="alert" className="alert alert-error text-sm">
                <span>{error}</span>
              </div>
            </div>
          ) : url ? (
            <iframe title={title} src={url} className="visor-pdf-frame" />
          ) : (
            <div className="flex h-full min-h-[40vh] items-center justify-center text-sm text-base-content/50">
              Sin vista previa.
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-base-300 px-5 py-4 md:px-6">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm gap-2"
            disabled={!url || loading || !!error}
            onClick={handleDownload}
          >
            <FileDown className="size-4 shrink-0" aria-hidden />
            Descargar PDF
          </button>
        </footer>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" aria-label="Cerrar visor PDF" onClick={onClose}>
          cerrar
        </button>
      </form>
    </dialog>
  )
}