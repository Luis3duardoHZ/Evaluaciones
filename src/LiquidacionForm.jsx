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

    let evaluacion = "";
    let clausula = "";
    let multiplicadorNormal = 0;
    let multiplicadorRiesgo = 0;
    let cumpleNormal = false;

    if (!tieneAval) {
      multiplicadorNormal = 3;
      multiplicadorRiesgo = 2.5;
      evaluacion = ratioTitular >= multiplicadorNormal ? "APROBADO" : "RECHAZADO";
      cumpleNormal = ratioTitular >= multiplicadorNormal;
      clausula = cumpleNormal
        ? ""
        : ratioTitular >= multiplicadorRiesgo
        ? "Aprobado con cláusula de riesgo"
        : "No cumple ni con cláusula de riesgo";
    } else {
      multiplicadorNormal = 4;
      multiplicadorRiesgo = 3;
      evaluacion = ratioTotal >= multiplicadorNormal ? "APROBADO" : "RECHAZADO";
      cumpleNormal = ratioTotal >= multiplicadorNormal;
      clausula = cumpleNormal
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
    const verde = [0, 128, 0];

    const ingresoTotal =
      Number(resultadoFinal.promedioTitular) +
      Number(resultadoFinal.promedioAval || 0);

    const operacionPromedioTitular = `(${liq1} + ${liq2} + ${liq3}) / 3 = ${resultadoFinal.promedioTitular}`;

    const operacionPromedioAval = tieneAval
      ? `(${liqAval1} + ${liqAval2} + ${liqAval3}) / 3 = ${resultadoFinal.promedioAval}`
      : null;

    let estadoTexto = resultadoFinal.evaluacion;
    let colorEstado = rojo;

    if (resultadoFinal.evaluacion === "APROBADO") {
      estadoTexto = "APROBADO";
      colorEstado = verde;
    }

    if (resultadoFinal.clausula === "Aprobado con cláusula de riesgo") {
      estadoTexto = "APROBADO CON CLÁUSULA DE RIESGO";
      colorEstado = amarillo;
    }

    doc.setFillColor(...azul);
    doc.rect(10, 10, 190, 20, "F");

    doc.setTextColor(...amarillo);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("INFORME DE EVALUACIÓN - PLUS ULTRA", 15, 23);

    doc.rect(160, 12, 30, 16);

    y = 40;

    doc.setDrawColor(...azul);
    doc.rect(10, y - 10, 190, 200);

    const filas = [
      ["RUT", resultadoFinal.rut],
      ["Postulante", resultadoFinal.postulante],
      ["Nombre Corredor", resultadoFinal.nombreCorredor],
      ["Dirección", resultadoFinal.direccion],
      ["PID", resultadoFinal.pid],
      ["Canon", `$${Number(resultadoFinal.canon).toLocaleString()}`],
      ["Política aplicada", resultadoFinal.multiplicadorNormal],
      ["Monto requerido normal", `$${Number(resultadoFinal.montoRequeridoNormal).toLocaleString()}`],
      ["Monto requerido cláusula", `$${Number(resultadoFinal.montoRequeridoRiesgo).toLocaleString()}`],
      ["Ingresos declarados", `$${ingresoTotal.toLocaleString()}`],
      ["Diferencia", `${resultadoFinal.diferencia >= 0 ? "+" : ""}$${Number(resultadoFinal.diferencia).toLocaleString()}`],
      ["Resultado final", estadoTexto],
      ["Nombre Aval", resultadoFinal.nombreAval || "N/A"],
      ["RUT Aval", resultadoFinal.rutAval || "N/A"],
      ["Fecha", resultadoFinal.fecha],
    ];

    filas.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...azul);
      doc.text(label, 15, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(label === "Resultado final" ? colorEstado : [0,0,0]);
      doc.text(String(value), 80, y);
      y += 8;
    });

    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...azul);
    doc.text("Detalle Cálculo Promedios:", 15, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Titular: ${operacionPromedioTitular}`, 15, y);
    y += 8;

    if (operacionPromedioAval) {
      doc.text(`Aval: ${operacionPromedioAval}`, 15, y);
    }

    doc.save(`Evaluacion_${resultadoFinal.rut}.pdf`);
  };

  const respaldarJSON = () => {
    const evaluaciones = obtenerEvaluaciones();
    const json = JSON.stringify(evaluaciones, null, 2);
    setJsonBackup(json);

    const blob = new Blob([json], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "evaluaciones_backup.json";
    link.click();
  };

  const restaurarJSONArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const jsonData = event.target.result;
      localStorage.setItem("evaluaciones", jsonData);
      const restauradas = JSON.parse(jsonData);
      if (restauradas.length > 0) {
        setResultadoFinal(restauradas[restauradas.length - 1]);
      } else {
        setResultadoFinal(null);
      }
      setJsonBackup(jsonData);
      alert("✅ JSON restaurado en localStorage y pantalla actualizada");
    };
    reader.readAsText(file);
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
          <button onClick={respaldarJSON}>Respaldar JSON</button>
          <input type="file" accept=".json" onChange={restaurarJSONArchivo} />
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
        <button onClick={respaldarJSON}>Respaldar JSON</button>
        <input type="file" accept=".json" onChange={restaurarJSONArchivo} />
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
