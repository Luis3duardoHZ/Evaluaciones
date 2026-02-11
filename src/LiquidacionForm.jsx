import { useState } from "react";
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
  const [liqAval1, setLiqAval1] = useState("");
  const [liqAval2, setLiqAval2] = useState("");
  const [liqAval3, setLiqAval3] = useState("");
  const [nombreAval, setNombreAval] = useState("");
  const [rutAval, setRutAval] = useState("");

  const [resultadoFinal, setResultadoFinal] = useState(null);
  const [jsonBackup, setJsonBackup] = useState("");

  const obtenerEvaluaciones = () => {
    const data = localStorage.getItem("evaluaciones");
    return data ? JSON.parse(data) : [];
  };

  const guardarEvaluacion = (nueva) => {
    const actuales = obtenerEvaluaciones();
    localStorage.setItem("evaluaciones", JSON.stringify([...actuales, nueva]));
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

    let evaluacion = "";
    let clausula = "";
    let multiplicadorNormal = 0;
    let multiplicadorRiesgo = 0;

    if (!tieneAval) {
      multiplicadorNormal = 3;
      multiplicadorRiesgo = 2.5;
      evaluacion = ratioTitular >= multiplicadorNormal ? "APROBADO" : "RECHAZADO";
      clausula =
        ratioTitular >= multiplicadorNormal
          ? ""
          : ratioTitular >= multiplicadorRiesgo
          ? "Aprobado con cláusula de riesgo"
          : "No cumple ni con cláusula de riesgo";
    } else {
      multiplicadorNormal = 4;
      multiplicadorRiesgo = 3;
      evaluacion = ratioTotal >= multiplicadorNormal ? "APROBADO" : "RECHAZADO";
      clausula =
        ratioTotal >= multiplicadorNormal
          ? ""
          : ratioTotal >= multiplicadorRiesgo
          ? "Aprobado con cláusula de riesgo"
          : "No cumple ni con cláusula de riesgo";
    }

    const montoRequeridoNormal = canon * multiplicadorNormal;
    const montoRequeridoRiesgo = canon * multiplicadorRiesgo;
    const diferencia = ingresoTotal - montoRequeridoNormal;

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
      multiplicadorRiesgo: `x${multiplicadorRiesgo}`,
      montoRequeridoNormal,
      montoRequeridoRiesgo,
      diferencia,
      evaluacion,
      clausula,
      nombreAval,
      rutAval,
      fecha: new Date().toLocaleString(),
    };

    guardarEvaluacion(nuevaEvaluacion);
    setResultadoFinal(nuevaEvaluacion);
  };

  const generarExcel = () => {
    const evaluaciones = obtenerEvaluaciones();
    const ws = XLSX.utils.json_to_sheet(evaluaciones);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Evaluaciones");
    XLSX.writeFile(wb, "Evaluaciones_Completas.xlsx");
  };

  const generarPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    let y = 20;

    const azul = [0, 31, 84];
    const amarillo = [255, 204, 0];
    const rojo = [214, 40, 40];

    doc.setFillColor(...azul);
    doc.rect(10, 10, 190, 20, "F");

    doc.setTextColor(...amarillo);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME DE EVALUACIÓN - PLUS ULTRA", 15, 25);

    y += 20;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);

    const estadoVisual =
      resultadoFinal.evaluacion === "APROBADO"
        ? "🟢 APROBADO"
        : resultadoFinal.clausula === "Aprobado con cláusula de riesgo"
        ? "🟡 APROBADO CON CLÁUSULA DE RIESGO"
        : "🔴 RECHAZADO";

    const observacion =
      resultadoFinal.evaluacion === "APROBADO"
        ? "Cumple con la política normal exigida."
        : resultadoFinal.clausula === "Aprobado con cláusula de riesgo"
        ? "El postulante no alcanza la política normal, pero cumple el monto exigido bajo cláusula de riesgo."
        : "No cumple con los requisitos mínimos exigidos.";

    const info = [
      ["RUT", resultadoFinal.rut],
      ["Postulante", resultadoFinal.postulante],
      ["Nombre Corredor", resultadoFinal.nombreCorredor],
      ["Dirección", resultadoFinal.direccion],
      ["PID", resultadoFinal.pid],
      ["Canon", `$${resultadoFinal.canon}`],
      ["Promedio Titular", `$${resultadoFinal.promedioTitular}`],
      ["Promedio Aval", `$${resultadoFinal.promedioAval}`],
      ["Monto requerido normal", `$${resultadoFinal.montoRequeridoNormal}`],
      ["Monto requerido cláusula", `$${resultadoFinal.montoRequeridoRiesgo}`],
      ["Diferencia", `$${resultadoFinal.diferencia}`],
    ];

    info.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${value}`, 80, y);
      y += 8;
    });

    y += 10;
    doc.setTextColor(...rojo);
    doc.setFont("helvetica", "bold");
    doc.text("📊 RESULTADO", 15, y);
    y += 8;

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Estado: ${estadoVisual}`, 15, y);
    y += 8;
    doc.text(`Observación: ${observacion}`, 15, y);

    doc.save(`Evaluacion_${resultadoFinal.rut}.pdf`);
  };

  const borrarTodo = () => {
    if (window.confirm("⚠️ ¿Seguro que quieres borrar todas las evaluaciones?")) {
      localStorage.removeItem("evaluaciones");
      setResultadoFinal(null);
      alert("✅ Todas las evaluaciones han sido eliminadas");
    }
  };

  const nuevaEvaluacion = () => setResultadoFinal(null);

  if (resultadoFinal) {
    return (
      <div className="form-container">
        <div className="hero-header">
          <h1>PLUS ULTRA</h1>
          <p>Resultado de Evaluación</p>
        </div>

        {Object.entries(resultadoFinal).map(([key, value]) => (
          <p key={key}><strong>{key}:</strong> {value}</p>
        ))}

        <div className="button-group">
          <button onClick={generarPDF}>Descargar PDF</button>
          <button onClick={generarExcel}>Descargar Excel</button>
          <button onClick={nuevaEvaluacion}>Nueva Evaluación</button>
          <button onClick={borrarTodo}>Borrar Todas las Evaluaciones</button>
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

      <div className="button-group" style={{ justifyContent: "flex-end", marginBottom: "10px" }}>
        <button onClick={generarExcel}>Descargar Excel</button>
        <button onClick={borrarTodo}>Borrar Todas las Evaluaciones</button>
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
            <input placeholder="RUT Aval" value={rutAval} onChange={e => setRutAval(e.target.value)} />
            <input placeholder="Nombre Aval" value={nombreAval} onChange={e => setNombreAval(e.target.value)} />
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
