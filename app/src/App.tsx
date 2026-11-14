import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { documentoVacio } from '@nucleo/esquema.js'
import { serviciosPorProveedor } from '@nucleo/catalogos-store.js'
import { aplicarSugerencias, sugerirParaDocumento } from '@nucleo/sugerir.js'
import { inicializarEvaluacion, resumenEvaluacion } from '@nucleo/evaluar-waf.js'
import { validarDocumento } from '@nucleo/validar.js'
import { renderArc42Markdown } from '@nucleo/render-arc42.js'
import { Arc42Preview } from './Arc42Preview'

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
  'Validación y exportación',
]

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any

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
  const [sugerencias, setSugerencias] = useState<ReturnType<typeof sugerirParaDocumento> | null>(null)

  const validation = useMemo(() => validarDocumento(doc), [doc])
  const preview = useMemo(() => renderArc42Markdown(doc), [doc])
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

  const patch = useCallback((fn: (d: Doc) => void) => {
    setDoc((prev: Doc) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  useEffect(() => {
    setSugerencias(sugerirParaDocumento(doc))
  }, [doc.contextoNegocio, doc.meta?.proveedorNube])

  const toggleServicio = (id: string) => {
    patch((d) => {
      const set = new Set(d.nube?.serviciosSeleccionados || [])
      if (set.has(id)) set.delete(id)
      else set.add(id)
      d.nube.serviciosSeleccionados = [...set]
    })
  }

  const aplicarSugerenciasClick = () => {
    const { documento, sugerencias: s } = aplicarSugerencias(structuredClone(doc))
    setDoc(documento)
    setSugerencias(s as ReturnType<typeof sugerirParaDocumento>)
  }

  const cargarEjemplo = async () => {
    const res = await fetch('/ejemplo-gestion-expedientes.json')
    const data = await res.json()
    inicializarEvaluacion(data)
    setDoc(data)
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

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col min-h-screen bg-base-200">
        <header className="navbar bg-base-100 border-b border-base-300 no-print px-4 gap-2">
          <div className="flex-none lg:hidden">
            <label htmlFor="app-drawer" className="btn btn-square btn-ghost drawer-button" aria-label="Menú">
              ☰
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{PASOS[step]}</h1>
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
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => void cargarEjemplo()}>
              Ejemplo
            </button>
            <label className="btn btn-sm btn-ghost cursor-pointer">
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && cargarArchivo(e.target.files[0])}
              />
              Abrir JSON
            </label>
            <button type="button" className="btn btn-sm btn-primary" onClick={aplicarSugerenciasClick}>
              Sugerencias
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 w-full max-w-4xl mx-auto min-w-0">
          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body gap-0 p-6 md:p-8 flex flex-col min-w-0">
            {step === 0 && (
              <FormStack>
                <StepHeader title="Proyecto y metas" desc="Define el alcance y el proveedor de nube principal del diseño." />
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
                <StepHeader
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
                <StepHeader
                  title="Escenarios de calidad"
                  desc="Cada escenario debe tener estímulo, respuesta esperada y medida verificable."
                />
                {(doc.arc42.escenariosCalidad?.length
                  ? doc.arc42.escenariosCalidad
                  : [{ nombre: '', estimulo: '', respuesta: '', medida: '' }]
                ).map((esc: { nombre: string; estimulo: string; respuesta: string; medida: string }, idx: number) => (
                  <StackPanel key={idx} title={`Escenario ${idx + 1}`} badge={`Q${idx + 1}`}>
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
                ))}
                <button
                  type="button"
                  className="btn btn-outline btn-sm mt-2"
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
                </button>
              </FormStack>
            )}

            {step === 3 && (
              <FormStack>
                <StepHeader
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
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    patch((d) => {
                      d.arc42.bloques = [...(d.arc42.bloques || []), { nombre: '', responsabilidad: '', tecnologia: '' }]
                    })
                  }
                >
                  Añadir bloque
                </button>
              </FormStack>
            )}

            {step === 4 && (
              <FormStack>
                <StepHeader
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
                <StepHeader
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
                    <strong>Sugeridos por reglas:</strong> {sugerencias.servicios.map((s) => s.nombre).join(' · ')}
                  </div>
                ) : null}
              </FormStack>
            )}

            {step === 6 && (
              <FormStack>
                <StepHeader
                  title="Patrones y antipatrones"
                  desc="Marca qué recomendaciones adoptas o qué riesgos arquitectónicos mitigas."
                />
                {(doc.patrones || []).length === 0 ? (
                  <div className="text-center py-10 text-sm text-base-content/55 border border-dashed border-base-300 rounded-xl">
                    Sin patrones aún. Pulsa <strong>Sugerencias</strong> en la barra superior.
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
                <StepHeader
                  title="Well-Architected"
                  desc="Línea base de controles por pilar (referencia, no el cuestionario oficial completo)."
                />
                <Box className="flex flex-wrap gap-2 mb-5">
                  <span className="badge badge-success badge-outline">{evalResumen.cumple} cumple</span>
                  <span className="badge badge-warning badge-outline">{evalResumen.parcial} parcial</span>
                  <span className="badge badge-error badge-outline">{evalResumen.brecha} brecha</span>
                </Box>
                {(doc.evaluacionWellArchitected?.pilares || []).map(
                  (p: { pilar: string; controles: { id: string; texto: string; estado: string; brecha: string }[] }) => (
                    <details
                      key={p.pilar}
                      className="collapse collapse-arrow border border-base-300 bg-base-100 rounded-xl mb-3"
                      open={evalResumen.brecha > 0 && p.controles.some((c) => c.estado === 'brecha')}
                    >
                      <summary className="font-medium text-sm py-1">{labelPilar(p.pilar)}</summary>
                      <Box className="collapse-content px-3 pb-3 min-w-0">
                        {p.controles.map((c) => (
                          <div key={c.id} className="py-4 px-3 border-b border-base-200 last:border-0 space-y-3">
                            <p className="text-sm leading-relaxed text-base-content/85">
                              <span className="badge badge-outline badge-sm font-mono mr-2 align-middle">{c.id}</span>
                              {c.texto}
                            </p>
                            <SelectInput
                              className="select-sm w-full"
                              value={c.estado}
                              onChange={(e) => setControlEstado(p.pilar, c.id, e.target.value)}
                            >
                              <option value="cumple">Cumple</option>
                              <option value="parcial">Parcial</option>
                              <option value="brecha">Brecha</option>
                              <option value="no-aplica">No aplica</option>
                            </SelectInput>
                            {c.estado === 'brecha' && (
                              <Field label="Descripción de la brecha">
                                <TextInput
                                  placeholder="Qué falta y cómo se cerrará"
                                  value={c.brecha}
                                  onChange={(e) =>
                                    patch((d) => {
                                      const bloque = d.evaluacionWellArchitected.pilares.find(
                                        (x: { pilar: string }) => x.pilar === p.pilar
                                      )
                                      const ctrl = bloque.controles.find((x: { id: string }) => x.id === c.id)
                                      ctrl.brecha = e.target.value
                                    })
                                  }
                                />
                              </Field>
                            )}
                          </div>
                        ))}
                      </Box>
                    </details>
                  )
                )}
              </FormStack>
            )}

            {step === 8 && (
              <FormStack>
                <StepHeader
                  title="ADRs y riesgos"
                  desc="Documenta decisiones y riesgos ligados a brechas de controles."
                />
                {(doc.arc42.decisiones || []).map(
                  (adr: { id: string; titulo: string }, idx: number) => (
                    <StackPanel key={adr.id || idx} title="Decisión de arquitectura" badge={adr.id || `ADR ${idx + 1}`}>
                      <Field label="Título">
                        <TextInput value={adr.titulo} onChange={(e) => patch((d) => (d.arc42.decisiones[idx].titulo = e.target.value))} />
                      </Field>
                    </StackPanel>
                  )
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    patch((d) => {
                      d.arc42.decisiones = [
                        ...(d.arc42.decisiones || []),
                        {
                          id: `ADR-${String((d.arc42.decisiones?.length || 0) + 1).padStart(3, '0')}`,
                          titulo: '',
                          estado: 'propuesto',
                          contexto: '',
                          decision: '',
                          consecuencias: '',
                        },
                      ]
                    })
                  }
                >
                  Añadir ADR
                </button>
                <SectionTitle compact>Riesgos</SectionTitle>
                <div className="flex flex-col gap-4 w-full min-w-0">
                {(doc.arc42.riesgos || []).map((r: { titulo: string; relacionControl: string }, idx: number) => (
                  <FormRow key={idx}>
                    <Field label="Título del riesgo">
                      <TextInput
                        value={r.titulo}
                        onChange={(e) => patch((d) => (d.arc42.riesgos[idx].titulo = e.target.value))}
                      />
                    </Field>
                    <Field label="Control relacionado" hint="Ej. REL-02">
                      <TextInput
                        value={r.relacionControl || ''}
                        onChange={(e) => patch((d) => (d.arc42.riesgos[idx].relacionControl = e.target.value))}
                      />
                    </Field>
                  </FormRow>
                ))}
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    patch((d) => {
                      d.arc42.riesgos = [
                        ...(d.arc42.riesgos || []),
                        { titulo: '', severidad: 'media', descripcion: '', relacionControl: '' },
                      ]
                    })
                  }
                >
                  Añadir riesgo
                </button>
              </FormStack>
            )}

            {step === 9 && (
              <FormStack>
                <StepHeader title="Validación y exportación" desc="Revisa el resultado del validador y exporta el entregable." />
                <CardValidation validation={validation} />
                <div className="toolbar" style={{ marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => download('arquitectura.json', JSON.stringify(doc, null, 2), 'application/json')}
                  >
                    Descargar JSON
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => download('arc42.md', preview, 'text/markdown')}>
                    Descargar Markdown
                  </button>
                  <button type="button" className="btn" onClick={() => window.print()}>
                    Imprimir / PDF
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setStep(0)}
                  style={{ marginBottom: '0.75rem' }}
                >
                  Volver al inicio para ajustes
                </button>
                <Field label="Vista previa arc42" hint="Markdown renderizado con diagramas Mermaid (contexto, C4 y despliegue)">
                  <Arc42Preview markdown={preview} />
                </Field>
              </FormStack>
            )}
            </div>
          </div>

          <Box className="flex flex-wrap justify-between items-center gap-3 mt-6 no-print">
            <span className="text-sm text-base-content/60">
              Paso {step + 1} de {PASOS.length}
            </span>
            <Box className="join">
              {step > 0 && (
                <button type="button" className="btn join-item" onClick={() => setStep((s) => s - 1)}>
                  Anterior
                </button>
              )}
              {step < PASOS.length - 1 && (
                <button type="button" className="btn btn-primary join-item" onClick={() => setStep((s) => s + 1)}>
                  Siguiente
                </button>
              )}
            </Box>
          </Box>
        </main>
      </div>

      <div className="drawer-side z-30">
        <label htmlFor="app-drawer" className="drawer-overlay" aria-label="Cerrar menú" />
        <aside className="bg-neutral text-neutral-content min-h-full w-72 p-4 flex flex-col gap-5">
          <div>
            <p className="font-semibold text-lg leading-tight">Arquitectura cloud</p>
            <p className="text-sm opacity-70 mt-1">arc42 · C4 · Well-Architected</p>
          </div>
          <div>
            <div className="flex justify-between text-xs opacity-80 mb-1">
              <span>Progreso</span>
              <span>
                {step + 1}/{PASOS.length}
              </span>
            </div>
            <progress className="progress progress-primary w-full" value={progressPct} max="100" />
          </div>
          <ul className="menu menu-sm gap-0.5 flex-1 overflow-y-auto">
            {PASOS.map((t, i) => (
              <li key={t}>
                <button
                  type="button"
                  className={i === step ? 'active' : ''}
                  onClick={() => {
                    setStep(i)
                    const el = document.getElementById('app-drawer') as HTMLInputElement | null
                    if (el) el.checked = false
                  }}
                >
                  <span className="badge badge-sm badge-neutral">{i + 1}</span>
                  {t}
                </button>
              </li>
            ))}
          </ul>
          <div className={`alert text-sm py-3 ${validation.valido ? 'alert-success' : 'alert-warning'}`}>
            <div>
              <p className="font-medium">{validation.valido ? 'Especificación válida' : 'Pendientes'}</p>
              <p className="text-xs opacity-90">
                {validation.valido
                  ? 'Lista para exportar.'
                  : `${validation.errores.length} error(es) de validación`}
              </p>
            </div>
          </div>
        </aside>
      </div>
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
    <div role="alert" className={`alert ${validation.valido ? 'alert-success' : 'alert-error'} mb-4`}>
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