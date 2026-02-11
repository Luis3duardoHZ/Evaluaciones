import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

const LiquidacionForm = () => {
  const [rut, setRut] = useState("");
  const [postulante, setPostulante] = useState("");
  const [nombreCorredor, setNombreCorredor] = useState("");
  const [direccion, setDireccion] = useState("");
  const [pid, setPid] = useState("");
  const [canon, setCanon] = useState("");

  const [liq1, setLiq1] = useState("");
  const [liq2, setLiq2] = useState("");
  const [liq3, setLiq3] = useState("");

  const [tieneAval, setTieneAval] = useState(false);
  const [avalRut, setAvalRut] = useState("");
  const [avalNombre, setAvalNombre] = useState("");
  const [liqAval1, setLiqAval1] = useState("");
  const [liqAval2, setLiqAval2] = useState("");
  const [liqAval3, setLiqAval3] = useState("");

  const [clausulaActiva, setClausulaActiva] = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState(null);

  const obtenerEvaluaciones = () => {
    const data = localStorage.getItem("evaluaciones");
    return data ? JSON.parse(data) : [];
  };

  const guardarEvaluacion = (nueva) => {
    const actuales = obtenerEvaluaciones();
    localStorage.setItem(
      "evaluaciones",
      JSON.stringify([...actuales, nueva])
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const evaluaciones = obtenerEvaluaciones();
    if (evaluaciones.some((ev) => ev.rut === rut)) {
      alert("⚠️ Este RUT ya fue evaluado.");
      return;
    }

    const promedioTitular =
      (Number(liq1) + Number(liq2) + Number(liq3)) / 3;

    let promedioAval = 0;
    if (tieneAval) {
      promedioAval =
        (Number(liqAval1) + Number(liqAval2) + Number(liqAval3)) / 3;
    }

    const ingresoTotal = promedioTitular + promedioAval;
    const ratioTitular = promedioTitular / Number(canon);
    const ratioTotal = ingresoTotal / Number(canon);

    let multiplicadorNormal = tieneAval ? 4 : 3;
    let cumpleNormal = (tieneAval ? ratioTotal : ratioTitular) >= multiplicadorNormal;

    let multiplicadorClausula = tieneAval ? 3 : 2.5;
    let montoRequeridoNormal = Number(canon) * multiplicadorNormal;
    let montoRequeridoClausula = Number(canon) * multiplicadorClausula;

    const diferencia = ingresoTotal - montoRequeridoNormal;
    const diferenciaStr = diferencia >= 0 ? `+$${diferencia.toFixed(0)}` : `-$${Math.abs(diferencia).toFixed(0)}`;

    let resultado = cumpleNormal ? "APROBADO" : "NO CUMPLE";

    const nuevaEvaluacion = {
      rut,
      postulante,
      nombreCorredor,
      direccion,
      pid,
      canon,
      promedioTitular: promedioTitular.toFixed(0),
      promedioAval: promedioAval.toFixed(0),
      ratioTitular: ratioTitular.toFixed(2),
      ratioTotal: ratioTotal.toFixed(2),
      multiplicadorNormal: `x${multiplicadorNormal}`,
      multiplicadorClausula: `x${multiplicadorClausula}`,
      cumpleNormal,
      cumpleClausula: false,
      montoRequeridoNormal,
      montoRequeridoClausula,
      diferencia: diferenciaStr,
      resultado,
      avalRut,
      avalNombre,
      fecha: new Date().toLocaleString(),
    };

    guardarEvaluacion(nuevaEvaluacion);
    setResultadoFinal(nuevaEvaluacion);
  };

  useEffect(() => {
    if (!resultadoFinal) return;
    if (!clausulaActiva) return;

    const ingresoTotal = Number(resultadoFinal.promedioTitular) + Number(resultadoFinal.promedioAval);
    const cumpleClausula = ingresoTotal >= resultadoFinal.montoRequeridoClausula;

    const nuevoResultado = cumpleClausula
      ? "APROBADO CON CLÁUSULA DE RIESGO"
      : "NO CUMPLE NI CON CLÁUSULA DE RIESGO";

    setResultadoFinal({
      ...resultadoFinal,
      resultado: nuevoResultado,
      cumpleClausula,
    });
  }, [clausulaActiva]);

  const generarExcel = () => {
    const evaluaciones = obtenerEvaluaciones();
    const ws = XLSX.utils.json_to_sheet(evaluaciones);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Evaluaciones");
    XLSX.writeFile(wb, "Evaluaciones_Completas.xlsx");
  };

  const generarPDF = (logoURL = null) => {
    if (!resultadoFinal) return;

    const doc = new jsPDF("p", "pt", "a4");
    let y = 30;

    doc.setFillColor(0, 31, 84);
    doc.rect(0, 0, 595, 60, "F");

    if (logoURL) doc.addImage(logoURL, "PNG", 520, 10, 50, 40);

    doc.setFontSize(20);
    doc.setTextColor(255, 204, 0);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME DE EVALUACIÓN - PLUS ULTRA", 20, 40);

    y += 50;

    const startX = 20;
    const startY = y;
    const cellHeight = 18;
    const col1Width = 180;
    const col2Width = 370;

    const agregarFila = (label, value, color = [0, 53, 102]) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(0, 31, 84);
      doc.rect(startX, y - 12, col1Width, cellHeight);
      doc.rect(startX + col1Width, y - 12, col2Width, cellHeight);

      doc.setFontSize(12);
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      doc.text(label, startX + 5, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, startX + col1Width + 5, y);

      y += cellHeight;
    };

    agregarFila("RUT:", resultadoFinal.rut);
    agregarFila("Nombre Postulante:", resultadoFinal.postulante);
    agregarFila("PID:", resultadoFinal.pid);
    agregarFila("Dirección:", resultadoFinal.direccion);
    agregarFila("Canon:", `$${resultadoFinal.canon}`);
    agregarFila("Política aplicada:", resultadoFinal.multiplicadorNormal);

    const promTitularStr = `${liq1} + ${liq2} + ${liq3} / 3 = ${resultadoFinal.promedioTitular}`;
    agregarFila("Promedio Titular:", promTitularStr);

    if (tieneAval) {
      const promAvalStr = `${liqAval1} + ${liqAval2} + ${liqAval3} / 3 = ${resultadoFinal.promedioAval}`;
      agregarFila("Promedio Aval:", promAvalStr);
      agregarFila("Total Titular + Aval:", `${Number(resultadoFinal.promedioTitular) + Number(resultadoFinal.promedioAval)}`);
      agregarFila("Aval RUT:", resultadoFinal.avalRut || "-");
      agregarFila("Aval Nombre:", resultadoFinal.avalNombre || "-");
    }

    agregarFila("Monto requerido normal:", `$${resultadoFinal.montoRequeridoNormal}`);
    agregarFila("Diferencia:", resultadoFinal.diferencia);

    if (!resultadoFinal.cumpleNormal) {
      agregarFila("Monto requerido cláusula:", `$${resultadoFinal.montoRequeridoClausula}`);
    }

    agregarFila("Ingresos declarados:", `$${tieneAval ? Number(resultadoFinal.promedioTitular) + Number(resultadoFinal.promedioAval) : Number(resultadoFinal.promedioTitular)}`);

    const colorResultado = resultadoFinal.resultado.includes("APROBADO") ? [255, 204, 0] : [214, 40, 40];
    agregarFila("Resultado final:", resultadoFinal.resultado, colorResultado);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 53, 102);
    agregarFila("Fecha evaluación:", resultadoFinal.fecha);

    doc.save(`Evaluacion_${resultadoFinal.rut}.pdf`);
  };

  const nuevaEvaluacion = () => {
    setResultadoFinal(null);
    setClausulaActiva(false);
  };

  if (resultadoFinal) {
    return (
      <div className="form-container">
        <div className="hero-header">
          <h1>PLUS ULTRA</h1>
          <p>Resultado de Evaluación</p>
        </div>

        <p><strong>RUT:</strong> {resultadoFinal.rut}</p>
        <p><strong>Nombre Postulante:</strong> {resultadoFinal.postulante}</p>
        <p><strong>PID:</strong> {resultadoFinal.pid}</p>
        <p><strong>Dirección:</strong> {resultadoFinal.direccion}</p>
        <p><strong>Canon:</strong> ${resultadoFinal.canon}</p>
        <p><strong>Política aplicada:</strong> {resultadoFinal.multiplicadorNormal}</p>
        <p><strong>Monto requerido normal:</strong> ${resultadoFinal.montoRequeridoNormal}</p>
        <p><strong>Diferencia:</strong> {resultadoFinal.diferencia}</p>

        {!resultadoFinal.cumpleNormal && (
          <>
            <p><strong>Monto requerido cláusula:</strong> ${resultadoFinal.montoRequeridoClausula}</p>
            {!clausulaActiva && (
              <button onClick={() => setClausulaActiva(true)}>Activar Cláusula de Riesgo</button>
            )}
          </>
        )}

        <p><strong>Ingresos declarados:</strong> ${tieneAval ? Number(resultadoFinal.promedioTitular) + Number(resultadoFinal.promedioAval) : Number(resultadoFinal.promedioTitular)}</p>
        {tieneAval && (
          <>
            <p><strong>Aval RUT:</strong> {resultadoFinal.avalRut}</p>
            <p><strong>Aval Nombre:</strong> {resultadoFinal.avalNombre}</p>
          </>
        )}
        <p><strong>Resultado final:</strong> {resultadoFinal.resultado}</p>

        <div className="button-group">
          <button onClick={() => generarPDF()}>Descargar PDF</button>
          <button onClick={generarExcel}>Descargar Excel</button>
          <button
            onClick={() => {
              localStorage.removeItem("evaluaciones");
              alert("Se han borrado todas las evaluaciones");
              window.location.reload();
            }}
          >
            Borrar todas las evaluaciones
          </button>
          <button onClick={nuevaEvaluacion}>Nueva Evaluación</button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="hero-header">
        <h1>PLUS ULTRA</h1>
        <p>Evaluación de Postulante</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <input placeholder="RUT" value={rut} onChange={e => setRut(e.target.value)} required />
          <input placeholder="Nombre Postulante" value={postulante} onChange={e => setPostulante(e.target.value)} required />
        </div>

        <input placeholder="Nombre Corredor" value={nombreCorredor} onChange={e => setNombreCorredor(e.target.value)} required />
        <input placeholder="Dirección Unidad" value={direccion} onChange={e => setDireccion(e.target.value)} required />

        <div className="grid-2">
          <input placeholder="PID" value={pid} onChange={e => setPid(e.target.value)} required />
          <input type="number" placeholder="Canon" value={canon} onChange={e => setCanon(e.target.value)} required />
        </div>

        <h3>Titular</h3>
        <div className="grid-3">
          <input type="number" placeholder="Liquidación 1" value={liq1} onChange={e => setLiq1(e.target.value)} required />
          <input type="number" placeholder="Liquidación 2" value={liq2} onChange={e => setLiq2(e.target.value)} required />
          <input type="number" placeholder="Liquidación 3" value={liq3} onChange={e => setLiq3(e.target.value)} required />
        </div>

        <div className="button-group">
          <button type="button" onClick={() => setTieneAval(!tieneAval)}>
            {tieneAval ? "Desactivar Aval" : "Activar Aval"}
          </button>
        </div>

        {tieneAval && (
          <>
            <h3>Aval</h3>
            <div className="grid-2">
              <input placeholder="RUT Aval" value={avalRut} onChange={e => setAvalRut(e.target.value)} />
              <input placeholder="Nombre Aval" value={avalNombre} onChange={e => setAvalNombre(e.target.value)} />
            </div>
            <div className="grid-3">
              <input type="number" placeholder="Liquidación Aval 1" value={liqAval1} onChange={e => setLiqAval1(e.target.value)} />
              <input type="number" placeholder="Liquidación Aval 2" value={liqAval2} onChange={e => setLiqAval2(e.target.value)} />
              <input type="number" placeholder="Liquidación Aval 3" value={liqAval3} onChange={e => setLiqAval3(e.target.value)} />
            </div>
          </>
        )}

        <div className="button-group">
          <button type="submit" className="primary-btn">Evaluar</button>
        </div>
      </form>
    </div>
  );
};

export default LiquidacionForm;
