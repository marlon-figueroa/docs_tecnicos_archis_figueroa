import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { initCatalogos } from './initCatalogos'
import {
  ChoiceChip,
  Field,
  FormRow,
  FormStack,
  PatternRow,
  ProviderBadge,
  SectionTitle,
  SelectInput,
  ServiceTile,
  StackPanel,
  StepHeader,
  TextArea,
  TextInput,
} from './ui'
import {
  AddButton,
  Braces,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  Eye,
  FileDown,
  FileText,
  FileUp,
  Icon,
  Layers,
  Download,
  Loader2,
  Menu,
  RotateCcw,
  Sparkles,
  STEP_ICONS,
  X,
} from './icons'
import { documentoVacio } from '@nucleo/esquema.js'
import { serviciosPorProveedor } from '@nucleo/catalogos-store.js'
import { aplicarSugerencias, sugerirParaDocumento } from '@nucleo/sugerir.js'
import { inicializarEvaluacion, resumenEvaluacion } from '@nucleo/evaluar-waf.js'
import { validarDocumento } from '@nucleo/validar.js'
import { renderArc42Markdown } from '@nucleo/render-arc42.js'
import { renderPresupuestoMarkdown } from '@nucleo/presupuesto.js'
import { SuggestionsPanel, type SugerenciasPreview } from './SuggestionsPanel'

const Arc42Preview = lazy(() => import('./Arc42Preview').then((m) => ({ default: m.Arc42Preview })))

initCatalogos()

const PASOS = [
  'Proyecto y metas',
  'Restricciones y contexto',
  'Escenarios de calidad',
  'Estrategia y bloques',
  'Ejecución y despliegue',
  'Nube',
  'Patrones',
  'Well-Architected',
  'Decisiones y riesgos',
  'Diagrama de arquitectura',
  'Validación y exportación',
]

const ArchitectureDiagram = lazy(() =>
  import('./ArchitectureDiagram').then((m) => ({ default: m.ArchitectureDiagram }))
)

function PasoHeader({
  stepIndex,
  ...props
}: { stepIndex: number } & Omit<ComponentProps<typeof StepHeader>, 'stepIndex' | 'stepTotal'>) {
  return <StepHeader stepIndex={stepIndex} stepTotal={PASOS.length} {...props} />
}

const CONTEXT_KEYS: { key: string; label: string }[] = [
  { key: 'cargaVariable', label: 'Carga variable' },
  { key: 'tareasCortas', label: 'Tareas cortas' },
  { key: 'datosTransaccionales', label: 'Datos transaccionales' },
  { key: 'modeloRelacional', label: 'Modelo relacional' },
  { key: 'multiplesClientes', label: 'Múltiples clientes' },
  { key: 'picosCarga', label: 'Picos de carga' },
  { key: 'integracionEventos', label: 'Integración por eventos' },
  { key: 'lecturasIntensivas', label: 'Lecturas intensivas' },
  { key: 'usuariosExternos', label: 'Usuarios externos' },
  { key: 'almacenamientoObjetos', label: 'Almacenamiento de objetos' },
  { key: 'estiloMicroservicios', label: 'Estilo microservicios' },
  { key: 'sistemaLegado', label: 'Sistema legado' },
  { key: 'rtoHorasMenor24', label: 'RTO < 24 h' },
  { key: 'slaOperativo', label: 'SLA operativo' },
  { key: 'contenedores', label: 'Contenedores' },
]

const CAP_ORDER = ['compute', 'integracion', 'datos', 'identidad', 'red', 'seguridad', 'observabilidad'] as const

const CAP_LABELS: Record<string, string> = {
  compute: 'Cómputo',
  integracion: 'Integración',
  datos: 'Datos',
  identidad: 'Identidad',
  red: 'Red',
  seguridad: 'Seguridad',
  observabilidad: 'Observabilidad',
}

function labelPilar(id: string) {
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

type ControlWaf = { id: string; texto: string; estado: string; brecha: string }

function PilarAccordion({
  pilar,
  controles,
  onEstado,
  onBrecha,
}: {
  pilar: string
  controles: ControlWaf[]
  onEstado: (controlId: string, estado: string) => void
  onBrecha: (controlId: string, brecha: string) => void
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const counts = controles.reduce(
    (acc, c) => {
      acc[c.estado] = (acc[c.estado] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = (counts.brecha || 0) > 0
    // Solo al montar: después el usuario abre y cierra sin que un cambio de estado lo fuerce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <details
      ref={detailsRef}
      className="collapse collapse-arrow bg-base-100 border border-base-300 rounded-2xl shadow-sm"
    >
      <summary className="collapse-title min-h-16 py-4 pr-12 cursor-pointer">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-base text-base-content">{labelPilar(pilar)}</span>
          <span className="badge badge-ghost badge-sm">{controles.length} controles</span>
          {(counts.brecha || 0) > 0 ? (
            <span className="badge badge-error badge-outline badge-sm">{counts.brecha} brecha</span>
          ) : null}
          {(counts.parcial || 0) > 0 ? (
            <span className="badge badge-warning badge-outline badge-sm">{counts.parcial} parcial</span>
          ) : null}
          {(counts.cumple || 0) > 0 ? (
            <span className="badge badge-success badge-outline badge-sm">{counts.cumple} cumple</span>
          ) : null}
        </span>
      </summary>
      <div className="collapse-content min-w-0 px-2 sm:px-4">
        <div className="flex flex-col gap-3 pb-4">
          {controles.map((c) => (
            <article key={c.id} className="rounded-xl border border-base-200 bg-base-200/25 p-4 min-w-0">
              <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                <p className="flex-1 min-w-0 text-sm leading-relaxed text-base-content/90">
                  <span className="badge badge-outline badge-sm font-mono mr-2 align-middle">{c.id}</span>
                  {c.texto}
                </p>
                <SelectInput
                  className="select-sm w-full lg:w-44 shrink-0"
                  value={c.estado}
                  aria-label={`Estado de ${c.id}`}
                  onChange={(e) => onEstado(c.id, e.target.value)}
                >
                  <option value="cumple">Cumple</option>
                  <option value="parcial">Parcial</option>
                  <option value="brecha">Brecha</option>
                  <option value="no-aplica">No aplica</option>
                </SelectInput>
              </div>
              {c.estado === 'brecha' ? (
                <div className="mt-3">
                  <Field label="Descripción de la brecha">
                    <TextInput
                      placeholder="Qué falta y cómo se cerrará"
                      value={c.brecha}
                      onChange={(e) => onBrecha(c.id, e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </details>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any

function nombrePendienteEliminar(doc: Doc, objetivo: { tipo: 'escenario' | 'adr' | 'riesgo'; idx: number }) {
  if (objetivo.tipo === 'adr') {
    const adr = doc.arc42.decisiones?.[objetivo.idx]
    return adr?.titulo?.trim() || adr?.id || `ADR ${objetivo.idx + 1}`
  }
  if (objetivo.tipo === 'riesgo') {
    return doc.arc42.riesgos?.[objetivo.idx]?.titulo?.trim() || `Riesgo ${objetivo.idx + 1}`
  }
  return doc.arc42.escenariosCalidad?.[objetivo.idx]?.nombre?.trim() || `Escenario ${objetivo.idx + 1}`
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [step, setStep] = useState(0)
  const [doc, setDoc] = useState<Doc>(() => {
    const d = documentoVacio()
    inicializarEvaluacion(d)
    return d
  })
  const [sugerenciasPanelOpen, setSugerenciasPanelOpen] = useState(false)
  const [pendienteEliminar, setPendienteEliminar] = useState<
    { tipo: 'escenario' | 'adr' | 'riesgo'; idx: number } | null
  >(null)
  const [exportandoPdf, setExportandoPdf] = useState(false)
  const [exportandoPresupuesto, setExportandoPresupuesto] = useState(false)
  const [confirmarReinicio, setConfirmarReinicio] = useState(false)
  const [visorArc42, setVisorArc42] = useState(false)
  const archivoJson = useRef<HTMLInputElement>(null)

  const sugerencias = useMemo(() => sugerirParaDocumento(doc), [doc])

  const perfilActivo = useMemo(
    () => CONTEXT_KEYS.filter(({ key }) => !!doc.contextoNegocio?.[key]).map(({ label }) => ({ label })),
    [doc.contextoNegocio]
  )

  const sugerenciasTotal = sugerencias.patrones.length + sugerencias.antipatrones.length + sugerencias.servicios.length

  const validation = useMemo(() => validarDocumento(doc), [doc])
  const preview = useMemo(() => renderArc42Markdown(doc), [doc])
  const controlesWaf = useMemo((): { pilar: string; controles: { id: string; texto: string }[] }[] => {
    const pilares = (doc.evaluacionWellArchitected?.pilares || []) as {
      pilar: string
      controles?: { id: string; texto: string }[]
    }[]
    return pilares
      .map((p) => ({ pilar: p.pilar, controles: p.controles || [] }))
      .filter((p) => p.controles.length > 0)
  }, [doc.evaluacionWellArchitected])
  const evalResumen = useMemo(() => resumenEvaluacion(doc), [doc])

  const proveedor = doc.meta?.proveedorNube || 'aws'
  const servicios = useMemo(() => serviciosPorProveedor(proveedor), [proveedor])
  const serviciosPorCapacidad = useMemo(() => {
    const map = new Map<string, typeof servicios>()
    for (const s of servicios) {
      const list = map.get(s.capacidad) || []
      list.push(s)
      map.set(s.capacidad, list)
    }
    return CAP_ORDER.filter((c) => map.has(c)).map((cap) => ({
      cap,
      label: CAP_LABELS[cap] || cap,
      items: map.get(cap)!,
    }))
  }, [servicios])

  const progressPct = Math.round(((step + 1) / PASOS.length) * 100)

  useEffect(() => {
    document.getElementById(`paso-nav-${step}`)?.scrollIntoView({ block: 'nearest' })
    if (step !== 10) setVisorArc42(false)
  }, [step])

  useEffect(() => {
    if (!visorArc42) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setVisorArc42(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visorArc42])

  const patch = useCallback((fn: (d: Doc) => void) => {
    setDoc((prev: Doc) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const toggleServicio = (id: string) => {
    patch((d) => {
      const set = new Set(d.nube?.serviciosSeleccionados || [])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      d.nube.serviciosSeleccionados = [...set]
    })
  }

  const aplicarSugerenciasClick = () => {
    const { documento } = aplicarSugerencias(structuredClone(doc))
    setDoc(documento)
    setSugerenciasPanelOpen(false)
  }

  const irAPaso = (idx: number) => {
    setStep(idx)
    setSugerenciasPanelOpen(false)
    const el = document.getElementById('app-drawer') as HTMLInputElement | null
    if (el) el.checked = false
  }

  const cargarEjemplo = async () => {
    const res = await fetch('/ejemplo-gestion-expedientes.json')
    const data = await res.json()
    inicializarEvaluacion(data)
    setDoc(data)
  }

  const reiniciar = () => {
    const d = documentoVacio()
    inicializarEvaluacion(d)
    setDoc(d)
    setStep(0)
    setSugerenciasPanelOpen(false)
    setPendienteEliminar(null)
    setVisorArc42(false)
    setConfirmarReinicio(false)
    if (archivoJson.current) archivoJson.current.value = ''
  }

  const cargarArchivo = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const data = JSON.parse(String(reader.result))
      inicializarEvaluacion(data)
      setDoc(data)
    }
    reader.readAsText(file)
  }

  const setControlEstado = (pilar: string, controlId: string, estado: string) => {
    patch((d) => {
      const bloque = d.evaluacionWellArchitected.pilares.find((p: { pilar: string }) => p.pilar === pilar)
      const c = bloque?.controles?.find((x: { id: string }) => x.id === controlId)
      if (c) c.estado = estado
    })
  }

  const descargarPdfArc42 = useCallback(async () => {
    setExportandoPdf(true)
    try {
      const titulo = doc.meta?.nombreProyecto?.trim() || 'arquitectura'
      const { exportArc42Pdf } = await import('./arc42DocumentExport')
      await exportArc42Pdf(titulo, preview, doc.meta?.fecha)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo generar el PDF.'
      window.alert(msg)
    } finally {
      setExportandoPdf(false)
    }
  }, [doc.meta?.fecha, doc.meta?.nombreProyecto, preview])

  const descargarPdfPresupuesto = useCallback(async () => {
    setExportandoPresupuesto(true)
    try {
      const titulo = doc.meta?.nombreProyecto?.trim() || 'presupuesto'
      const { exportPresupuestoPdf } = await import('./arc42DocumentExport')
      await exportPresupuestoPdf(titulo, renderPresupuestoMarkdown(doc), doc.meta?.fecha)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo generar el PDF del presupuesto.'
      window.alert(msg)
    } finally {
      setExportandoPresupuesto(false)
    }
  }, [doc])

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen bg-base-200">
        <header className="navbar bg-base-100 border-b border-base-300 no-print px-4 gap-2">
          <div className="flex-none lg:hidden">
            <label htmlFor="app-drawer" className="btn btn-square btn-ghost drawer-button" aria-label="Menú">
              <Icon icon={Menu} size="lg" />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate flex items-center gap-2 min-w-0">
              <Icon icon={STEP_ICONS[step]} size="lg" className="text-primary" />
              <span className="truncate">{PASOS[step]}</span>
            </h1>
            <p className="text-xs text-base-content/60 truncate">
              {doc.meta?.nombreProyecto?.trim() ? (
                <span className="inline-flex items-center gap-2">
                  <ProviderBadge proveedor={proveedor} />
                  {doc.meta.nombreProyecto}
                </span>
              ) : (
                'Completa los pasos para generar arquitectura.json'
              )}
            </p>
          </div>
          <div className="flex-none flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-ghost gap-1.5" onClick={() => void cargarEjemplo()}>
              <Icon icon={FileText} />
              Ejemplo
            </button>
            <label className="btn btn-sm btn-ghost cursor-pointer gap-1.5">
              <input
                ref={archivoJson}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && cargarArchivo(e.target.files[0])}
              />
              <Icon icon={FileUp} />
              Abrir JSON
            </label>
            <button type="button" className="btn btn-sm btn-ghost gap-1.5" onClick={() => setConfirmarReinicio(true)}>
              <RotateCcw className="size-4 shrink-0" aria-hidden />
              Reiniciar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary gap-1.5"
              onClick={() => setSugerenciasPanelOpen((v) => !v)}
            >
              <Icon icon={Sparkles} />
              Sugerencias
              {sugerenciasTotal > 0 ? (
                <span className="badge badge-sm badge-neutral text-primary-content min-w-[1.25rem]">
                  {sugerenciasTotal}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        <main className="shrink-0 py-4 md:py-8 pb-6 w-full max-w-full px-4 sm:px-6 lg:px-10 xl:px-12 min-w-0">
          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body gap-0 p-6 md:p-8 flex flex-col min-w-0">
            {step === 0 && (
              <FormStack>
                <PasoHeader
                  stepIndex={0}
                  icon={STEP_ICONS[0]}
                  title="Proyecto y metas"
                  desc="Define el alcance y el proveedor de nube principal del diseño."
                />
                <Field label="Nombre del proyecto" hint="Aparece en arc42 y exportaciones">
                  <TextInput
                    value={doc.meta.nombreProyecto}
                    onChange={(e) => patch((d) => (d.meta.nombreProyecto = e.target.value))}
                    placeholder="Ej. Portal de trámites"
                  />
                </Field>
                <FormRow>
                  <Field label="Proveedor de nube">
                    <SelectInput
                      value={doc.meta.proveedorNube}
                      onChange={(e) =>
                        patch((d) => {
                          d.meta.proveedorNube = e.target.value
                          d.evaluacionWellArchitected.proveedorEvaluado =
                            e.target.value === 'azure' ? 'azure' : 'aws'
                          if (e.target.value !== 'hibrido') {
                            d.nube.serviciosSeleccionados = (d.nube.serviciosSeleccionados || []).filter(
                              (id: string) => {
                                const s = serviciosPorProveedor(e.target.value).find((x) => x.id === id)
                                return !!s
                              }
                            )
                          }
                        })
                      }
                    >
                      <option value="aws">Amazon Web Services</option>
                      <option value="azure">Microsoft Azure</option>
                      <option value="hibrido">Híbrido AWS + Azure</option>
                    </SelectInput>
                  </Field>
                  <Field label="Autor">
                    <TextInput
                      value={doc.meta.autor}
                      onChange={(e) => patch((d) => (d.meta.autor = e.target.value))}
                      placeholder="Responsable de arquitectura"
                    />
                  </Field>
                </FormRow>
                <Field label="Visión">
                  <TextArea
                    value={doc.arc42.introduccion.vision}
                    onChange={(e) => patch((d) => (d.arc42.introduccion.vision = e.target.value))}
                    placeholder="Qué problema resuelve el sistema y para quién"
                  />
                </Field>
                <Field label="Metas" hint="Una meta por línea">
                  <TextArea
                    value={(doc.arc42.introduccion.metas || []).join('\n')}
                    onChange={(e) =>
                      patch((d) => (d.arc42.introduccion.metas = e.target.value.split('\n').filter(Boolean)))
                    }
                    placeholder={'Disponibilidad 99.5%\nReducir tiempo de ciclo en 40%'}
                  />
                </Field>
              </FormStack>
            )}

            {step === 1 && (
              <FormStack>
                <PasoHeader
                  stepIndex={1}
                  icon={STEP_ICONS[1]}
                  title="Restricciones y contexto"
                  desc="Límites del proyecto y perfil de negocio para sugerir patrones y servicios."
                />
                <Field label="Restricciones" hint="Una por línea">
                  <TextArea
                    value={(doc.arc42.restricciones || []).join('\n')}
                    onChange={(e) => patch((d) => (d.arc42.restricciones = e.target.value.split('\n').filter(Boolean)))}
                  />
                </Field>
                <Field label="Actores" hint="Nombre de cada actor, uno por línea">
                  <TextArea
                    value={(doc.arc42.contexto.actores || []).map((a: { nombre: string }) => a.nombre).join('\n')}
                    onChange={(e) =>
                      patch((d) => {
                        d.arc42.contexto.actores = e.target.value
                          .split('\n')
                          .filter(Boolean)
                          .map((nombre: string) => ({ nombre }))
                      })
                    }
                  />
                </Field>
                <SectionTitle compact>Perfil de negocio</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-fr w-full min-w-0">
                  {CONTEXT_KEYS.map(({ key, label }) => (
                    <ChoiceChip
                      key={key}
                      label={label}
                      checked={!!doc.contextoNegocio?.[key]}
                      onChange={(v) => patch((d) => (d.contextoNegocio[key] = v))}
                    />
                  ))}
                </div>
              </FormStack>
            )}

            {step === 2 && (
              <FormStack>
                <PasoHeader
                  stepIndex={2}
                  icon={STEP_ICONS[2]}
                  title="Escenarios de calidad"
                  desc="Cada escenario debe tener estímulo, respuesta esperada y medida verificable."
                />
                {(doc.arc42.escenariosCalidad || []).length === 0 ? (
                  <p className="text-sm text-base-content/60 border border-dashed border-base-300 rounded-xl px-4 py-6 text-center">
                    No hay escenarios. Añade al menos uno con estímulo, respuesta y medida.
                  </p>
                ) : null}
                {(doc.arc42.escenariosCalidad || []).map(
                  (esc: { nombre: string; estimulo: string; respuesta: string; medida: string }, idx: number) => (
                  <StackPanel
                    key={idx}
                    title={`Escenario ${idx + 1}`}
                    badge={`Q${idx + 1}`}
                    onRemove={() => setPendienteEliminar({ tipo: 'escenario', idx })}
                  >
                    <Field label="Nombre">
                      <TextInput
                        value={esc.nombre}
                        onChange={(e) => patch((d) => (d.arc42.escenariosCalidad[idx].nombre = e.target.value))}
                      />
                    </Field>
                    <FormRow>
                      <Field label="Estímulo">
                        <TextInput
                          value={esc.estimulo}
                          onChange={(e) => patch((d) => (d.arc42.escenariosCalidad[idx].estimulo = e.target.value))}
                        />
                      </Field>
                      <Field label="Respuesta">
                        <TextInput
                          value={esc.respuesta}
                          onChange={(e) => patch((d) => (d.arc42.escenariosCalidad[idx].respuesta = e.target.value))}
                        />
                      </Field>
                    </FormRow>
                    <Field label="Medida" hint="Criterio observable">
                      <TextInput
                        value={esc.medida}
                        onChange={(e) => patch((d) => (d.arc42.escenariosCalidad[idx].medida = e.target.value))}
                        placeholder="Latencia p95 < 2 s"
                      />
                    </Field>
                  </StackPanel>
                )
                )}
                <AddButton
                  onClick={() =>
                    patch((d) => {
                      d.arc42.escenariosCalidad = [
                        ...(d.arc42.escenariosCalidad || []),
                        { nombre: '', estimulo: '', respuesta: '', medida: '' },
                      ]
                    })
                  }
                >
                  Añadir escenario
                </AddButton>
              </FormStack>
            )}

            {step === 3 && (
              <FormStack>
                <PasoHeader
                  stepIndex={3}
                  icon={STEP_ICONS[3]}
                  title="Estrategia y bloques C4"
                  desc="Vista de contenedores: responsabilidad clara por bloque."
                />
                <Field label="Resumen de estrategia">
                  <TextArea
                    value={doc.arc42.estrategia?.resumen || ''}
                    onChange={(e) => patch((d) => (d.arc42.estrategia.resumen = e.target.value))}
                  />
                </Field>
                {(doc.arc42.bloques?.length ? doc.arc42.bloques : [{ nombre: '', responsabilidad: '', tecnologia: '' }]).map(
                  (b: { nombre: string; responsabilidad: string; tecnologia: string }, idx: number) => (
                    <StackPanel key={idx} title={`Contenedor ${idx + 1}`} badge="C4">
                      <Field label="Nombre">
                        <TextInput value={b.nombre} onChange={(e) => patch((d) => (d.arc42.bloques[idx].nombre = e.target.value))} />
                      </Field>
                      <Field label="Responsabilidad">
                        <TextInput
                          value={b.responsabilidad}
                          onChange={(e) => patch((d) => (d.arc42.bloques[idx].responsabilidad = e.target.value))}
                        />
                      </Field>
                      <Field label="Tecnología">
                        <TextInput
                          value={b.tecnologia || ''}
                          onChange={(e) => patch((d) => (d.arc42.bloques[idx].tecnologia = e.target.value))}
                        />
                      </Field>
                    </StackPanel>
                  )
                )}
                <AddButton
                  onClick={() =>
                    patch((d) => {
                      d.arc42.bloques = [...(d.arc42.bloques || []), { nombre: '', responsabilidad: '', tecnologia: '' }]
                    })
                  }
                >
                  Añadir bloque
                </AddButton>
              </FormStack>
            )}

            {step === 9 && (
              <FormStack>
                <PasoHeader
                  stepIndex={9}
                  icon={STEP_ICONS[9]}
                  title="Diagrama de arquitectura"
                  desc="Vista interactiva C4: actores, contenedores, sistemas externos y servicios de nube del diseño actual."
                />
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-base-300 bg-base-100 p-8 text-sm text-base-content/60 text-center">
                      Cargando visor JointJS…
                    </div>
                  }
                >
                  <ArchitectureDiagram doc={doc} />
                </Suspense>
                <p className="text-xs text-base-content/55">
                  El diagrama se alimenta de actores, contenedores C4 y servicios de nube. Arrastra el lienzo, usa Ctrl +
                  rueda para zoom y el botón centrar para reencuadrar.
                </p>
              </FormStack>
            )}

            {step === 4 && (
              <FormStack>
                <PasoHeader
                  stepIndex={4}
                  icon={STEP_ICONS[4]}
                  title="Ejecución y despliegue"
                  desc="Describe entornos, redes y topología en el proveedor elegido."
                />
                <Field label="Topología de despliegue">
                  <TextArea
                    value={doc.arc42.despliegue?.topologia || ''}
                    onChange={(e) => patch((d) => (d.arc42.despliegue.topologia = e.target.value))}
                  />
                </Field>
                <Field label="Notas operativas">
                  <TextArea
                    value={doc.arc42.despliegue?.notas || ''}
                    onChange={(e) => patch((d) => (d.arc42.despliegue.notas = e.target.value))}
                  />
                </Field>
              </FormStack>
            )}

            {step === 5 && (
              <FormStack>
                <PasoHeader
                  stepIndex={5}
                  icon={STEP_ICONS[5]}
                  title="Servicios de nube"
                  desc={`Catálogo para ${proveedor.toUpperCase()}. Selecciona los servicios del diseño.`}
                />
                <div className="mb-4">
                  <ProviderBadge proveedor={proveedor} />
                </div>
                {serviciosPorCapacidad.map(({ label, items }, idx) => (
                  <section key={label} className="w-full min-w-0">
                    <SectionTitle compact={idx > 0}>{label}</SectionTitle>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 auto-rows-fr w-full min-w-0">
                      {items.map((s) => {
                        const sel = (doc.nube?.serviciosSeleccionados || []).includes(s.id)
                        const incompatible = proveedor !== 'hibrido' && s.proveedor !== proveedor
                        return (
                          <ServiceTile
                            key={s.id}
                            nombre={s.nombre}
                            descripcion={s.descripcion}
                            selected={sel}
                            disabled={incompatible}
                            onToggle={() => toggleServicio(s.id)}
                          />
                        )
                      })}
                    </div>
                  </section>
                ))}
                {sugerencias?.servicios?.length ? (
                  <div className="alert alert-info text-sm mt-4">
                    <Sparkles className="size-5 shrink-0" aria-hidden />
                    <span>
                      <strong>Sugeridos por reglas:</strong> {sugerencias.servicios.map((s) => s.nombre).join(' · ')}
                    </span>
                  </div>
                ) : null}
              </FormStack>
            )}

            {step === 6 && (
              <FormStack>
                <PasoHeader
                  stepIndex={6}
                  icon={STEP_ICONS[6]}
                  title="Patrones y antipatrones"
                  desc="Marca qué recomendaciones adoptas o qué riesgos arquitectónicos mitigas."
                />
                {(doc.patrones || []).length === 0 ? (
                  <div className="text-center py-10 text-sm text-base-content/55 border border-dashed border-base-300 rounded-xl">
                    Sin patrones aún. Abre <strong>Sugerencias</strong> en la barra superior y aplica el catálogo.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full min-w-0">
                    {(doc.patrones || []).map((p: { id: string; nombre: string; estado: string }, i: number) => (
                      <PatternRow
                        key={p.id}
                        nombre={p.nombre}
                        value={p.estado}
                        options={[
                          { value: 'sugerido', label: 'Sugerido' },
                          { value: 'adoptado', label: 'Adoptado' },
                          { value: 'descartado', label: 'Descartado' },
                        ]}
                        onChange={(v) => patch((d) => (d.patrones[i].estado = v))}
                      />
                    ))}
                  </div>
                )}
                <SectionTitle compact>Antipatrones</SectionTitle>
                {(doc.antipatrones || []).length === 0 ? (
                  <div className="text-center py-10 text-sm text-base-content/55 border border-dashed border-base-300 rounded-xl">
                    No hay advertencias cargadas.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full min-w-0">
                    {(doc.antipatrones || []).map((a: { id: string; nombre: string; estado: string }, i: number) => (
                      <PatternRow
                        key={a.id}
                        nombre={a.nombre}
                        value={a.estado}
                        options={[
                          { value: 'advertencia', label: 'Advertencia' },
                          { value: 'mitigado', label: 'Mitigado' },
                          { value: 'abierto', label: 'Abierto' },
                        ]}
                        onChange={(v) => patch((d) => (d.antipatrones[i].estado = v))}
                      />
                    ))}
                  </div>
                )}
              </FormStack>
            )}

            {step === 7 && (
              <FormStack>
                <PasoHeader
                  stepIndex={7}
                  icon={STEP_ICONS[7]}
                  title="Well-Architected"
                  desc="Línea base de controles por pilar (referencia, no el cuestionario oficial completo)."
                />
                <Box className="flex flex-wrap gap-2 mb-5">
                  <span className="badge badge-success badge-outline">{evalResumen.cumple} cumple</span>
                  <span className="badge badge-warning badge-outline">{evalResumen.parcial} parcial</span>
                  <span className="badge badge-error badge-outline">{evalResumen.brecha} brecha</span>
                </Box>
                <div className="flex flex-col gap-3 w-full min-w-0">
                  {(doc.evaluacionWellArchitected?.pilares || []).map(
                    (p: { pilar: string; controles: ControlWaf[] }) => (
                      <PilarAccordion
                        key={p.pilar}
                        pilar={p.pilar}
                        controles={p.controles || []}
                        onEstado={(controlId, estado) => setControlEstado(p.pilar, controlId, estado)}
                        onBrecha={(controlId, brecha) =>
                          patch((d) => {
                            const bloque = d.evaluacionWellArchitected.pilares.find(
                              (x: { pilar: string }) => x.pilar === p.pilar
                            )
                            const ctrl = bloque.controles.find((x: { id: string }) => x.id === controlId)
                            ctrl.brecha = brecha
                          })
                        }
                      />
                    )
                  )}
                </div>
              </FormStack>
            )}

            {step === 8 && (
              <FormStack>
                <PasoHeader
                  stepIndex={8}
                  icon={STEP_ICONS[8]}
                  title="ADRs y riesgos"
                  desc="Cada decisión lleva estado, contexto, decisión y consecuencias. Cada riesgo lleva severidad, causa y el control que cubre."
                />
                <SectionTitle compact>Decisiones de arquitectura</SectionTitle>
                {(doc.arc42.decisiones || []).length === 0 ? (
                  <p className="text-sm text-base-content/60 border border-dashed border-base-300 rounded-xl px-4 py-6 text-center">
                    No hay decisiones. Un diseño híbrido necesita un ADR que justifique el cruce entre nubes.
                  </p>
                ) : null}
                {(doc.arc42.decisiones || []).map(
                  (
                    adr: {
                      id: string
                      titulo: string
                      estado: string
                      contexto: string
                      decision: string
                      consecuencias: string
                    },
                    idx: number,
                  ) => (
                    <StackPanel
                      key={`${adr.id || 'adr'}-${idx}`}
                      title={adr.titulo?.trim() || 'Decisión de arquitectura'}
                      badge={adr.id || `ADR ${idx + 1}`}
                      onRemove={() => setPendienteEliminar({ tipo: 'adr', idx })}
                    >
                      <FormRow>
                        <Field label="Identificador">
                          <TextInput
                            value={adr.id || ''}
                            onChange={(e) => patch((d) => (d.arc42.decisiones[idx].id = e.target.value))}
                            placeholder="ADR-001"
                          />
                        </Field>
                        <Field label="Estado">
                          <SelectInput
                            value={adr.estado || 'propuesto'}
                            onChange={(e) => patch((d) => (d.arc42.decisiones[idx].estado = e.target.value))}
                          >
                            <option value="propuesto">Propuesto</option>
                            <option value="aceptada">Aceptada</option>
                            <option value="rechazada">Rechazada</option>
                            <option value="obsoleta">Obsoleta</option>
                          </SelectInput>
                        </Field>
                      </FormRow>
                      <Field label="Título">
                        <TextInput
                          value={adr.titulo || ''}
                          onChange={(e) => patch((d) => (d.arc42.decisiones[idx].titulo = e.target.value))}
                          placeholder="Qué se decidió, en una frase"
                        />
                      </Field>
                      <Field label="Contexto" hint="Fuerzas y restricciones que obligan a decidir">
                        <TextArea
                          value={adr.contexto || ''}
                          onChange={(e) => patch((d) => (d.arc42.decisiones[idx].contexto = e.target.value))}
                        />
                      </Field>
                      <Field label="Decisión" hint="La opción elegida y, si aplica, las descartadas">
                        <TextArea
                          value={adr.decision || ''}
                          onChange={(e) => patch((d) => (d.arc42.decisiones[idx].decision = e.target.value))}
                        />
                      </Field>
                      <Field label="Consecuencias" hint="Coste, deuda o efectos que acepta el diseño">
                        <TextArea
                          value={adr.consecuencias || ''}
                          onChange={(e) => patch((d) => (d.arc42.decisiones[idx].consecuencias = e.target.value))}
                        />
                      </Field>
                    </StackPanel>
                  ),
                )}
                <AddButton
                  onClick={() =>
                    patch((d) => {
                      const previas = d.arc42.decisiones || []
                      const ids = new Set(previas.map((item: { id?: string }) => item.id))
                      let n = previas.length + 1
                      let id = `ADR-${String(n).padStart(3, '0')}`
                      while (ids.has(id)) {
                        n += 1
                        id = `ADR-${String(n).padStart(3, '0')}`
                      }
                      d.arc42.decisiones = [
                        ...previas,
                        { id, titulo: '', estado: 'propuesto', contexto: '', decision: '', consecuencias: '' },
                      ]
                    })
                  }
                >
                  Añadir ADR
                </AddButton>
                <SectionTitle compact>Riesgos y deuda técnica</SectionTitle>
                {(doc.arc42.riesgos || []).length === 0 ? (
                  <p className="text-sm text-base-content/60 border border-dashed border-base-300 rounded-xl px-4 py-6 text-center">
                    No hay riesgos. Cada brecha de Well-Architected debe tener un riesgo con su control.
                  </p>
                ) : null}
                {(doc.arc42.riesgos || []).map(
                  (
                    r: {
                      titulo: string
                      severidad: string
                      descripcion: string
                      causa: string
                      relacionControl: string
                    },
                    idx: number,
                  ) => {
                    const controlActual = r.relacionControl || ''
                    const conocido = controlesWaf.some((grupo) => grupo.controles.some((c) => c.id === controlActual))
                    return (
                      <StackPanel
                        key={`riesgo-${idx}`}
                        title={r.titulo?.trim() || `Riesgo ${idx + 1}`}
                        badge={r.severidad || 'media'}
                        onRemove={() => setPendienteEliminar({ tipo: 'riesgo', idx })}
                      >
                        <FormRow>
                          <Field label="Título">
                            <TextInput
                              value={r.titulo || ''}
                              onChange={(e) => patch((d) => (d.arc42.riesgos[idx].titulo = e.target.value))}
                              placeholder="Qué puede fallar"
                            />
                          </Field>
                          <Field label="Severidad">
                            <SelectInput
                              value={r.severidad || 'media'}
                              onChange={(e) => patch((d) => (d.arc42.riesgos[idx].severidad = e.target.value))}
                            >
                              <option value="baja">Baja</option>
                              <option value="media">Media</option>
                              <option value="alta">Alta</option>
                            </SelectInput>
                          </Field>
                        </FormRow>
                        <Field label="Descripción" hint="Impacto si el riesgo se materializa">
                          <TextArea
                            value={r.descripcion || ''}
                            onChange={(e) => patch((d) => (d.arc42.riesgos[idx].descripcion = e.target.value))}
                          />
                        </Field>
                        <Field label="Causa" hint="Por qué existe hoy">
                          <TextArea
                            value={r.causa || ''}
                            onChange={(e) => patch((d) => (d.arc42.riesgos[idx].causa = e.target.value))}
                          />
                        </Field>
                        <Field label="Control relacionado" hint="El identificador debe coincidir con la brecha, por ejemplo REL-02">
                          <SelectInput
                            value={controlActual}
                            onChange={(e) => patch((d) => (d.arc42.riesgos[idx].relacionControl = e.target.value))}
                          >
                            <option value="">Sin control</option>
                            {controlActual && !conocido ? (
                              <option value={controlActual}>{controlActual}</option>
                            ) : null}
                            {controlesWaf.map((grupo) => (
                              <optgroup key={grupo.pilar} label={labelPilar(grupo.pilar)}>
                                {grupo.controles.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.id} — {c.texto}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </SelectInput>
                        </Field>
                      </StackPanel>
                    )
                  },
                )}
                <AddButton
                  onClick={() =>
                    patch((d) => {
                      d.arc42.riesgos = [
                        ...(d.arc42.riesgos || []),
                        { titulo: '', severidad: 'media', descripcion: '', causa: '', relacionControl: '' },
                      ]
                    })
                  }
                >
                  Añadir riesgo
                </AddButton>
              </FormStack>
            )}

            {step === 10 && (
              <FormStack>
                <PasoHeader
                  stepIndex={10}
                  icon={STEP_ICONS[10]}
                  title="Validación y exportación"
                  desc="Revisa el resultado del validador, consulta el documento y exporta el entregable."
                />
                <CardValidation validation={validation} />
                <div className="grid w-full min-w-0 gap-4 lg:grid-cols-2">
                  <section className="flex min-w-0 flex-col rounded-2xl border border-base-300 bg-base-100 p-5 shadow-sm">
                    <h3 className="inline-flex items-center gap-2 text-base font-semibold">
                      <Download className="size-4 text-primary" aria-hidden />
                      Exportar
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-base-content/65">
                      El JSON es la línea base. El Markdown y el PDF recogen el documento arc42; el presupuesto agrupa
                      los servicios de nube seleccionados.
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        className="btn btn-primary w-full gap-2"
                        onClick={() => download('arquitectura.json', JSON.stringify(doc, null, 2), 'application/json')}
                      >
                        <Braces className="size-4 shrink-0" aria-hidden />
                        JSON
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary w-full gap-2"
                        disabled={exportandoPresupuesto}
                        onClick={() => void descargarPdfPresupuesto()}
                      >
                        {exportandoPresupuesto ? (
                          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <CircleDollarSign className="size-4 shrink-0" aria-hidden />
                        )}
                        {exportandoPresupuesto ? 'Generando…' : 'Presupuesto'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary w-full gap-2"
                        onClick={() => download('arc42.md', preview, 'text/markdown')}
                      >
                        <FileText className="size-4 shrink-0" aria-hidden />
                        Markdown
                      </button>
                      <button
                        type="button"
                        className="btn w-full gap-2"
                        disabled={exportandoPdf}
                        onClick={() => void descargarPdfArc42()}
                      >
                        {exportandoPdf ? (
                          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <FileDown className="size-4 shrink-0" aria-hidden />
                        )}
                        {exportandoPdf ? 'Generando…' : 'PDF arc42'}
                      </button>
                    </div>
                  </section>
                  <section className="flex min-w-0 flex-col rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-base-100 to-base-100 p-5 shadow-sm">
                    <h3 className="inline-flex items-center gap-2 text-base font-semibold">
                      <FileText className="size-4 text-primary" aria-hidden />
                      Documento arc42
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-base-content/65">
                      Vista con las secciones del documento y los diagramas Mermaid. El PDF usa títulos en rojo, texto
                      en negro y cada diagrama en una página horizontal.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary mt-4 w-full gap-2 sm:w-auto sm:self-start"
                      onClick={() => setVisorArc42(true)}
                    >
                      <Eye className="size-4 shrink-0" aria-hidden />
                      Abrir visor
                    </button>
                  </section>
                </div>
                <button type="button" className="btn btn-ghost btn-sm self-start gap-2" onClick={() => setStep(0)}>
                  <RotateCcw className="size-4 shrink-0" aria-hidden />
                  Volver al inicio para ajustes
                </button>
              </FormStack>
            )}
            </div>
          </div>

        </main>

        <footer className="shrink-0 mt-auto border-t border-base-300 bg-base-100 no-print">
          <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 py-3 flex flex-wrap justify-between items-center gap-3">
            <span className="text-sm text-base-content/60 inline-flex items-center gap-2">
              <Icon icon={STEP_ICONS[step]} size="sm" className="opacity-70" />
              Paso {step + 1} de {PASOS.length}
            </span>
            <Box className="join">
              {step > 0 && (
                <button type="button" className="btn join-item gap-1.5" onClick={() => setStep((s) => s - 1)}>
                  <ChevronLeft className="size-4" aria-hidden />
                  Anterior
                </button>
              )}
              {step < PASOS.length - 1 && (
                <button type="button" className="btn btn-primary join-item gap-1.5" onClick={() => setStep((s) => s + 1)}>
                  Siguiente
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              )}
            </Box>
          </div>
        </footer>
      </div>

      <div className="drawer-side z-30">
        <label htmlFor="app-drawer" className="drawer-overlay" aria-label="Cerrar menú" />
        <aside className="flex min-h-full w-80 flex-col bg-white text-base-content shadow-[6px_0_28px_-10px_rgba(30,16,60,0.28)] lg:min-h-screen lg:border-r lg:border-base-300/70">
          <div className="p-4 pb-2">
            <div className="flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[0_10px_24px_-14px_rgba(95,39,205,0.55),0_1px_2px_rgba(20,10,40,0.06)] ring-1 ring-base-300/80">
              <div className="shrink-0 rounded-xl bg-primary p-2 text-primary-content shadow-[0_8px_16px_-8px_rgba(95,39,205,0.9)]">
                <Layers className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold leading-tight">Arquitectura cloud</p>
                <p className="mt-1 text-xs text-base-content/60">arc42 · C4 · Well-Architected</p>
              </div>
            </div>
          </div>
          <div className="px-4 pb-2">
            <div className="rounded-2xl bg-white px-3.5 py-3 shadow-[0_8px_18px_-14px_rgba(20,10,40,0.55)] ring-1 ring-base-300/70">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-base-content/70">Progreso</span>
                <span className="tabular-nums text-primary">
                  {step + 1}/{PASOS.length}
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-base-200 shadow-[inset_0_1px_2px_rgba(20,10,40,0.16)]"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso del asistente"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Pasos del asistente">
            {PASOS.map((t, i) => {
              const actual = i === step
              const visto = i < step
              return (
                <button
                  key={t}
                  id={`paso-nav-${i}`}
                  type="button"
                  aria-current={actual ? 'step' : undefined}
                  className={[
                    'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    actual
                      ? 'bg-white text-primary shadow-[0_10px_18px_-12px_rgba(95,39,205,0.75),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-primary/25'
                      : 'text-base-content/75 hover:bg-white hover:text-base-content hover:shadow-[0_8px_16px_-12px_rgba(20,10,40,0.45)]',
                  ].join(' ')}
                  onClick={() => {
                    setStep(i)
                    const el = document.getElementById('app-drawer') as HTMLInputElement | null
                    if (el) el.checked = false
                  }}
                >
                  <span
                    className={[
                      'grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular-nums',
                      actual
                        ? 'bg-primary text-primary-content shadow-[0_6px_12px_-6px_rgba(95,39,205,0.95)]'
                        : visto
                          ? 'bg-success/15 text-success'
                          : 'bg-base-200 text-base-content/55 shadow-[inset_0_1px_1px_rgba(20,10,40,0.08)]',
                    ].join(' ')}
                  >
                    {visto && !actual ? <CircleCheck className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <Icon
                    icon={STEP_ICONS[i]}
                    size="sm"
                    className={actual ? 'text-primary' : visto ? 'text-success' : 'text-base-content/45'}
                  />
                  <span className={`min-w-0 flex-1 text-sm leading-snug ${actual ? 'font-semibold' : ''}`}>{t}</span>
                </button>
              )
            })}
          </nav>
          <div className="p-4 pt-2">
            <div
              className={[
                'flex items-start gap-2.5 rounded-2xl bg-white px-3.5 py-3 text-sm shadow-[0_10px_20px_-14px_rgba(20,10,40,0.5)] ring-1',
                validation.valido ? 'ring-success/30' : 'ring-warning/40',
              ].join(' ')}
            >
              {validation.valido ? (
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
              ) : (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
              )}
              <div>
                <p className="font-medium">{validation.valido ? 'Especificación válida' : 'Pendientes'}</p>
                <p className="text-xs text-base-content/65">
                  {validation.valido
                    ? 'Lista para exportar.'
                    : `${validation.errores.length} error(es) de validación`}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
      {pendienteEliminar ? (
        <dialog
          className="modal modal-open"
          aria-labelledby="confirmar-eliminar"
          onCancel={(e) => {
            e.preventDefault()
            setPendienteEliminar(null)
          }}
        >
          <div className="modal-box">
            <h3 id="confirmar-eliminar" className="font-semibold text-lg">
              {pendienteEliminar.tipo === 'adr'
                ? 'Eliminar decisión'
                : pendienteEliminar.tipo === 'riesgo'
                  ? 'Eliminar riesgo'
                  : 'Eliminar escenario'}
            </h3>
            <p className="py-3 text-sm text-base-content/75 leading-relaxed">
              ¿Eliminar <strong>{nombrePendienteEliminar(doc, pendienteEliminar)}</strong>? Esta acción no se puede
              deshacer.
            </p>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setPendienteEliminar(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => {
                  const objetivo = pendienteEliminar
                  patch((d) => {
                    if (objetivo.tipo === 'escenario') {
                      d.arc42.escenariosCalidad = (d.arc42.escenariosCalidad || []).filter(
                        (_: unknown, i: number) => i !== objetivo.idx,
                      )
                    } else if (objetivo.tipo === 'adr') {
                      d.arc42.decisiones = (d.arc42.decisiones || []).filter(
                        (_: unknown, i: number) => i !== objetivo.idx,
                      )
                    } else {
                      d.arc42.riesgos = (d.arc42.riesgos || []).filter(
                        (_: unknown, i: number) => i !== objetivo.idx,
                      )
                    }
                  })
                  setPendienteEliminar(null)
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" aria-label="Cancelar eliminación" onClick={() => setPendienteEliminar(null)}>
              cerrar
            </button>
          </form>
        </dialog>
      ) : null}
      {visorArc42 && step === 10 ? (
        <dialog
          className="modal modal-open"
          aria-labelledby="visor-arc42-titulo"
          onCancel={(e) => {
            e.preventDefault()
            setVisorArc42(false)
          }}
        >
          <div className="modal-box visor-arc42 flex flex-col">
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-base-300 px-5 py-4 md:px-6">
              <div className="min-w-0">
                <h3 id="visor-arc42-titulo" className="text-lg font-semibold">
                  Documento arc42
                </h3>
                <p className="truncate text-sm text-base-content/60">
                  {doc.meta?.nombreProyecto?.trim() || 'Sin nombre de proyecto'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost btn-square shrink-0"
                aria-label="Cerrar visor"
                autoFocus
                onClick={() => setVisorArc42(false)}
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-base-200/70 px-4 py-5 md:px-8 md:py-6">
              <Suspense
                fallback={
                  <div className="mx-auto max-w-4xl rounded-xl border border-base-300 bg-base-100 p-6 text-sm text-base-content/60">
                    Cargando vista previa…
                  </div>
                }
              >
                <Arc42Preview markdown={preview} />
              </Suspense>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" aria-label="Cerrar visor" onClick={() => setVisorArc42(false)}>
              cerrar
            </button>
          </form>
        </dialog>
      ) : null}
      {confirmarReinicio ? (
        <dialog
          className="modal modal-open"
          aria-labelledby="confirmar-reinicio"
          onCancel={(e) => {
            e.preventDefault()
            setConfirmarReinicio(false)
          }}
        >
          <div className="modal-box">
            <h3 id="confirmar-reinicio" className="font-semibold text-lg">
              Reiniciar el asistente
            </h3>
            <p className="py-3 text-sm text-base-content/75 leading-relaxed">
              Se vacían los formularios, la evaluación Well-Architected y el diagrama. Esta acción no se puede deshacer.
            </p>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setConfirmarReinicio(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-error" onClick={reiniciar}>
                Reiniciar
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" aria-label="Cancelar reinicio" onClick={() => setConfirmarReinicio(false)}>
              cerrar
            </button>
          </form>
        </dialog>
      ) : null}
      <SuggestionsPanel
        open={sugerenciasPanelOpen}
        onClose={() => setSugerenciasPanelOpen(false)}
        sugerencias={sugerencias as SugerenciasPreview}
        proveedor={proveedor}
        perfilActivo={perfilActivo}
        onApply={aplicarSugerenciasClick}
        onGoStep={irAPaso}
      />
    </div>
  )
}

function Box({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

function CardValidation({
  validation,
}: {
  validation: { valido: boolean; errores: string[]; advertencias: string[] }
}) {
  return (
    <div role="alert" className={`alert ${validation.valido ? 'alert-success' : 'alert-error'}`}>
      {validation.valido ? (
        <CircleCheck className="size-6 shrink-0" aria-hidden />
      ) : (
        <CircleAlert className="size-6 shrink-0" aria-hidden />
      )}
      <Box>
        {validation.valido ? (
          <p>El documento cumple la línea base y puede exportarse.</p>
        ) : (
          <>
            <p className="font-semibold">Corrige estos puntos:</p>
            <ul className="list-disc list-inside text-sm mt-2">
              {validation.errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </>
        )}
        {validation.advertencias.length > 0 && (
          <>
            <p className="font-semibold mt-3">Advertencias</p>
            <ul className="list-disc list-inside text-sm">
              {validation.advertencias.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </>
        )}
      </Box>
    </div>
  )
}