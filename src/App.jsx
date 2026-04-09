import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "./assets/logo.png";
import {productosPublico as productosBase} from "./data/productos";
//import {productosTecProfesional as productosBase} from "./data/productos";
//import {productosDistJunior as productosBase} from "./data/productos";
//import {productosAliado as productosBase} from "./data/productos";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const labels = {
  nombre: "Nombre",
  cedula: "Cédula",
  telefono: "Teléfono",
  email: "Correo electrónico",
  direccion: "Dirección",
  ciudad: "Ciudad"
};

export default function App() {
  const [cliente, setCliente] = useState({
    nombre: "",
    cedula: "",
    telefono: "",
    email: "",
    direccion: "",
    ciudad: ""
  });

  const [items, setItems] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const [metodoPago, setMetodoPago] = useState("Bancolombia");
  const [notas, setNotas] = useState("");
  const [consecutivoManual, setConsecutivoManual] = useState("");
  const [canal, setCanal] = useState("WEB");
  const [busqueda, setBusqueda] = useState("");
  const [fecha, setFecha] = useState("");
  const [facturasCSV, setFacturasCSV] = useState([]);
  const [registroFacturas, setRegistroFacturas] = useState([]);

  const agregarProducto = () => {
    const prod = productosBase.find(p => p.codigo === productoSeleccionado);
    if (!prod) return;
    setItems([...items, { ...prod, cantidad: 1, descuento: 0 }]);
  };

  const actualizarItem = (index, campo, valor) => {
    const nuevos = [...items];
    nuevos[index][campo] = valor;
    setItems(nuevos);
  };

  const productosFiltrados = productosBase.filter(p =>
  p.nombre.toLowerCase().includes(busqueda.toLowerCase())
);

  const obtenerConsecutivo = () => {
  let numero = localStorage.getItem("consecutivoFactura");

  // 👉 Si nunca se ha creado factura, inicia en 3403
  if (!numero) {
    numero = 3403;
  } else {
    numero = parseInt(numero) + 1;
  }

  localStorage.setItem("consecutivoFactura", numero);

  return numero;
};

  const obtenerSiguienteConsecutivo = () => {
  let numero = localStorage.getItem("consecutivoFactura");

  if (!numero) {
    return 3403; // valor inicial
  }

  return parseInt(numero) + 1;
};

  const calcularTotal = () => {
    return items.reduce((acc, item) => {
      const subtotal = item.precio * item.cantidad;
      const descuento = subtotal * (item.descuento / 100);
      return acc + (subtotal - descuento);
    }, 0);
  };

  const eliminarItem = (index) => {
  setItems(items.filter((_, i) => i !== index));
};

const formatearPago = (pago) => {
  if (pago === "Bancolombia") return "BANCO";
  if (pago === "Nequi") return "NEQUI";
  if (pago === "Daviplata") return "DAVIPLATA";
  if (pago === "Crédito") return "CREDITO";
  return pago;
};

const limpiarTexto = (texto) => {
  return texto
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^A-Z0-9 ]/g, "") // quita caracteres raros
    .trim()
    .replace(/\s+/g, "-"); // espacios → guiones
};

 const generarPDF = () => {
  if (items.length === 0) {
    alert("Agrega al menos un producto");
    return;
  }

  const doc = new jsPDF({
  orientation: "portrait", // vertical
  unit: "mm",              // milímetros
  format: "letter"         // 🔥 tamaño carta
});
  let numeroFinal;

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();

const margin = 10;

doc.setLineWidth(0.5);
doc.setDrawColor(150); // gris elegante

doc.rect(
  margin,
  margin,
  pageWidth - margin * 2,
  pageHeight - margin * 2
);

  if (consecutivoManual) {
    numeroFinal = consecutivoManual; // usa el que escribiste
  } else {
    numeroFinal = obtenerConsecutivo(); // usa automático
  }

  const consecutivo = `PDPF-${numeroFinal}`;

  const margin2 = 15;
const centerX = pageWidth / 2;

// 🖼️ LOGO (izquierda)
doc.addImage(logo, "PNG", margin2, margin2, 45, 25);

// 🧾 CONSECUTIVO (derecha)
doc.setFontSize(9);
doc.setFont(undefined, "bold");

doc.text(consecutivo, pageWidth - 20, 20, {
  align: "right"
});

// 🏢 EMPRESA (centro)
let y = 20;

doc.setFontSize(12);
doc.text("PIEL DE PORCELANA S.A.S", centerX, y, {
  align: "center"
});

y += 6;

doc.setFont(undefined, "normal");
doc.setFontSize(10);

const datosEmpresa = [
  "NIT 901.384.939-6",
  "Cra 52B # 90-235 Oficina 306",
  "Tel: (57) 3195762456",
  "Barranquilla - Colombia",
  "administracion@pieldeporcelana.co",
  "www.pieldeporcelana.co"
];

datosEmpresa.forEach(linea => {
  doc.text(linea, centerX, y, { align: "center" });
  y += 5;
});

 doc.line(15, y + 2, pageWidth - 15, y + 2);

 doc.setFontSize(10);

  const rightX = pageWidth - margin2;

    // 🔥 AQUÍ EMPIEZAN LOS DATOS DEL CLIENTE
    y += 10;

    doc.setFontSize(10);

    doc.text(`Cliente: ${cliente.nombre}`, margin2, y);

    doc.text(`Fecha Elaboración:  ${fecha}`, rightX, y, {
      align: "right"
    });

    y += 5;
    doc.text(`Cédula: ${cliente.cedula}`, margin2, y);

    y += 5;
    doc.text(`Tel: ${cliente.telefono}`, margin2, y);

    y += 5;
    doc.text(`Email: ${cliente.email}`, margin2, y);

    y += 5;
    doc.text(`Dirección: ${cliente.direccion}`, margin2, y);

    y += 5;
    doc.text(`Ciudad: ${cliente.ciudad}`, margin2, y);

  const rows = items.map(item => {
    const subtotal = item.precio * item.cantidad;
    const descuento = subtotal * (item.descuento / 100);
    return [
      item.codigo,
      item.nombre,
      item.cantidad,
      `$${item.precio}`,
      `$${(subtotal - descuento).toFixed(0)}`
    ];
  });

  autoTable(doc, {
    startY:  y + 15,
    head: [["Código", "Producto", "Cant", "Valor Unit", "Total"]],
    body: rows
  });

  const nombreCliente = limpiarTexto(cliente.nombre || "CLIENTE");
  const apellidoCliente = limpiarTexto(cliente.nombre || "GENERAL");
  const canalLimpio = limpiarTexto(canal);
  const pagoLimpio = limpiarTexto(formatearPago(metodoPago));

  const finalY = doc.lastAutoTable.finalY;

  doc.setFont(undefined, "bold");

 doc.text(`Total: $${calcularTotal().toFixed(0)}`, 190, finalY + 10, {
  align: "right"
});
  doc.text(`Medio de Pago: ${pagoLimpio}`, margin2, finalY + 20);
  doc.text(`Notas: ${notas}`, margin2, finalY + 30);

  
  

  const nombreArchivo = `${consecutivo}-${nombreCliente} ${apellidoCliente}-${canalLimpio}-${pagoLimpio}.pdf`;

  doc.save(nombreArchivo);

  const nuevaFila = {
    FECHA: fecha,
    FACTURA: consecutivo,
    CLIENTE: cliente.nombre,
    VALOR: calcularTotal().toFixed(0),
    CANAL: canal,
    MEDIO_PAGO: metodoPago
  };

  setRegistroFacturas(prev => [...prev, nuevaFila]);

  setConsecutivoManual("");
};
//esto es para automatizar las facturas subiendo un csv

const normalizarPago = (metodo, tags) => {
  if (!metodo) return "BANCO";

  const metodoUpper = metodo.toUpperCase();
  const tagsUpper = (tags || "").toUpperCase();

  // 🔥 PAYU
  if (metodoUpper.includes("PAYU")) {
    return "BANCO";
  }

  // 🔥 BANCOLOMBIA
  if (metodoUpper.includes("BANCOLOMBIA")) {
    return "BANCO";
  }

  // 🔥 MANUAL → usar TAGS
  if (metodoUpper.includes("MANUAL")) {
    if (!tagsUpper) return "BANCO";

    // aquí puedes personalizar más si quieres
    if (tagsUpper.includes("NEQUI")) return "NEQUI";
    if (tagsUpper.includes("DAVIPLATA")) return "DAVIPLATA";
    if (tagsUpper.includes("BANCO")) return "BANCO";
    if (tagsUpper.includes('PAY U')) return "BANCO";
    console.log({tagsUpper})
    return tagsUpper; // fallback
  }

  // 🔥 DEFAULT
  return "BANCO";
};

const agruparPedidos = (data) => {
  const pedidos = {};

  data.forEach(row => {
    const id = row.Name;

    if (!pedidos[id]) {
      pedidos[id] = {
        cliente: {
          nombre: row["Shipping Name"],
          telefono: row["Shipping Phone"],
          direccion: row["Shipping Address1"],
          ciudad: row["Shipping City"],
          email: row.Email || ""
        },
        metodoPago: row["Payment Method"],
        tags: row["Tags"],
        notas: row.Notes || "",
        shipping: Number(row["Shipping"] || 0),
        fecha: row["Created at"],
        orden:id,
        items: []
      };
    }

    pedidos[id].items.push({
      codigo: row["Lineitem sku"] || "SHOP",
      nombre: row["Lineitem name"],
      cantidad: Number(row["Lineitem quantity"]),
      precio: Number(row["Lineitem price"]),
      descuento: Number(row["Lineitem discount"] || 0)
    });
  });

  return Object.values(pedidos);
};

const handleCSV = (e) => {
  const file = e.target.files[0];

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const pedidos = agruparPedidos(results.data);
      console.log(pedidos)
      setFacturasCSV(pedidos);
    }
  });
};

const formatearFechaCSV = (fecha) => {
  if (!fecha) return "";

  const soloFecha = fecha.split(" ")[0]; // "2026-03-22"
  const [year, month, day] = soloFecha.split("-");

  return `${day}-${month}-${year}`;
};

const generarPDFCSV = (factura) => {
  if (!factura.items || factura.items.length === 0) {
    alert("Factura sin productos");
    return;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter"
  });

  let numeroFinal = obtenerConsecutivo(); // 🔥 SIEMPRE automático en CSV

  const consecutivo = `PDPF-${numeroFinal}`;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const margin = 10;

  doc.setLineWidth(0.5);
  doc.setDrawColor(150);

  doc.rect(
    margin,
    margin,
    pageWidth - margin * 2,
    pageHeight - margin * 2
  );

  const margin2 = 15;
  const centerX = pageWidth / 2;

  // 🖼️ LOGO
  doc.addImage(logo, "PNG", margin2, margin2, 45, 25);

  // 🧾 CONSECUTIVO
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");

  doc.text(consecutivo, pageWidth - 20, 20, {
    align: "right"
  });

  // 🏢 EMPRESA
  let y = 20;

  doc.setFontSize(12);
  doc.text("PIEL DE PORCELANA S.A.S", centerX, y, {
    align: "center"
  });

  y += 6;

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);

  const datosEmpresa = [
    "NIT 901.384.939-6",
    "Cra 52B # 90-235 Oficina 306",
    "Tel: (57) 3195762456",
    "Barranquilla - Colombia",
    "administracion@pieldeporcelana.co",
    "www.pieldeporcelana.co"
  ];

  datosEmpresa.forEach(linea => {
    doc.text(linea, centerX, y, { align: "center" });
    y += 5;
  });

  doc.line(15, y + 2, pageWidth - 15, y + 2);

  const rightX = pageWidth - margin2;

  // 🔥 DATOS DESDE CSV
  const cliente = factura.cliente;

  y += 10;

  doc.text(`Cliente: ${cliente.nombre || ""}`, margin2, y);

 doc.text(
  `Fecha Elaboración: ${formatearFechaCSV(factura.fecha)}`,
  rightX,
  y,
  { align: "right" }
);

  y += 5;
  doc.text(`Cédula: ${cliente.cedula || cliente.telefono}`, margin2, y);

  y += 5;
  doc.text(`Tel: ${cliente.telefono || ""}`, margin2, y);

  y += 5;
  doc.text(`Email: ${cliente.email || ""}`, margin2, y);

  y += 5;
  doc.text(`Dirección: ${cliente.direccion || ""}`, margin2, y);

  y += 5;
  doc.text(`Ciudad: ${cliente.ciudad || ""}`, margin2, y);

  // 🧾 PRODUCTOS
  let rows = factura.items.map(item => {
  const subtotal = item.precio * item.cantidad;
  const descuento = subtotal * (item.descuento / 100);

  return [
    item.codigo,
    item.nombre,
    item.cantidad,
    `$${item.precio}`,
    `$${(subtotal - descuento).toFixed(0)}`
  ];
});

// 🔥 AGREGAR SHIPPING COMO PRODUCTO
if (factura.shipping && factura.shipping > 0) {
  rows.push([
    "SERV4",
    "FLETE NACIONAL",
    1,
    `$${factura.shipping}`,
    `$${factura.shipping}`
  ]);
}

  autoTable(doc, {
    startY: y + 15,
    head: [["Código", "Producto", "Cant", "Valor Unit", "Total"]],
    body: rows
  });

  const finalY = doc.lastAutoTable.finalY;

  // 🔥 TOTAL
 let total = factura.items.reduce((acc, item) => {
  const subtotal = item.precio * item.cantidad;
  const descuento = subtotal * (item.descuento / 100);
  return acc + (subtotal - descuento);
}, 0);

// 🔥 sumar envío
if (factura.shipping) {
  total += Number(factura.shipping);
}

  doc.setFont(undefined, "bold");

  doc.text(`Total: $${total.toFixed(0)}`, pageWidth - 20, finalY + 10, {
    align: "right"
  });

  // 🔥 PAGO Y NOTAS
  console.log(factura.tags)
  const pagoNormalizado = normalizarPago(
  factura.metodoPago,
  factura.tags
)



  const pagoLimpio = limpiarTexto(pagoNormalizado);
  const canalLimpio = limpiarTexto(factura.canal || "WEB");

  doc.text(`Medio de Pago: ${pagoLimpio}`, margin2, finalY + 20);
  doc.text(`Notas: ${factura.notas || ""}`, margin2, finalY + 30);

  // 🔥 NOMBRE ARCHIVO
  const nombreCliente = limpiarTexto(cliente.nombre || "CLIENTE");

  const nombreArchivo = `${consecutivo}-${nombreCliente}-${canalLimpio}-${pagoLimpio}.pdf`;

  doc.save(nombreArchivo);

  const totals = factura.items.reduce((acc, item) => {
  const subtotal = item.precio * item.cantidad;
  const descuento = subtotal * (item.descuento / 100);
  return acc + (subtotal - descuento);
}, 0) + (factura.shipping || 0);

const nuevaFila = {
  FECHA: formatearFechaCSV(factura.fecha),
  FACTURA: consecutivo,
  CLIENTE: factura.cliente.nombre,
  VALOR: totals.toFixed(0),
  CANAL: factura.canal || "WEB",
  MEDIO_PAGO: pagoNormalizado
};

setRegistroFacturas(prev => [...prev, nuevaFila]);
};

const exportarExcel = () => {
  if (registroFacturas.length === 0) {
    alert("No hay datos para exportar");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(registroFacturas);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Facturas");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array"
  });

  const data = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  saveAs(data, "reporte_facturas.xlsx");
};



  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">Software de Facturación</h1>
        <h2 className="text-lg font-semibold text-center text-gray-600">
           FACTURA: PDPF-{obtenerSiguienteConsecutivo()}
        </h2>
        <button
  onClick={exportarExcel}
  className="bg-blue-600 text-white px-4 py-2 rounded-lg"
>
  Descargar Cuaderno
</button>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">

            <label className="text-sm font-semibold mb-1 text-gray-500">
              Consecutivo Manual
            </label>
            <input
              type="number"
              placeholder="Consecutivo manual (opcional)"
              className="border p-2 rounded-lg w-full"
              value={consecutivoManual}
              onChange={(e) => setConsecutivoManual(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1 text-gray-500">
              Canal de Compra
            </label>
            <select
              className="border p-2 rounded-lg w-full"
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
            >
              <option>VPUBLICO</option>
              <option>WEB</option>
              <option>DISTRIBUIDORA</option>
              <option>COSMETOLOGA</option>
            </select>
          </div>
          <div className="flex flex-col">
          <label className="text-sm font-semibold mb-1 text-gray-500">
            Fecha de elaboración
          </label>

          <input
            type="date"
            className="w-full border p-2 rounded-lg"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>
        </div>

        {/* Cliente */}
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(cliente).map((key) => (
            <div key={key} className="flex flex-col">
              <label className="text-sm font-semibold mb-1 text-gray-500">
                {labels[key]}
              </label>

              <input
                className="border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={cliente[key]}
                onChange={(e) =>
                  setCliente({ ...cliente, [key]: e.target.value })
                }
              />
            </div>
          ))}
        </div>

        {/* Productos */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative w-full">
              <span className="font-semibold">Agregar producto</span>
  <input
    type="text"
    placeholder="Buscar producto..."
    className="border p-2 rounded-lg w-full"
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
  />

  {busqueda && (
    <div className="absolute bg-white border w-full mt-1 rounded-lg shadow max-h-40 overflow-y-auto z-10">
      {productosFiltrados.map((p) => (
        <div
          key={p.codigo}
          className="p-2 hover:bg-gray-100 cursor-pointer"
          onClick={() => {
            setItems([...items, { ...p, cantidad: 1, descuento: 0 }]);
            setBusqueda("");
          }}
        >
          {p.nombre} - ${p.precio}
        </div>
      ))}
    </div>
  )}
</div>
          </div>

         {items.map((item, i) => (
  <div key={i} className="grid grid-cols-6 gap-2 items-center">
    
    <span className="font-semibold">{item.nombre}</span>

    <input
      type="number"
      className="border p-1 rounded"
      value={item.cantidad}
      onChange={e => actualizarItem(i, "cantidad", Number(e.target.value))}
    />

    <input
      type="number"
      className="border p-1 rounded"
      placeholder="% desc"
      value={item.descuento}
      onChange={e => actualizarItem(i, "descuento", Number(e.target.value))}
    />

    <span>${item.precio}</span>

    <span className="font-bold">
      ${(item.precio * item.cantidad * (1 - item.descuento / 100)).toFixed(0)}
    </span>

    {/* 🔥 BOTÓN ELIMINAR */}
    <button
      onClick={() => eliminarItem(i)}
      className="text-red-500 hover:text-red-700 font-bold text-lg"
    >
      ✕
    </button>

  </div>
))}
        </div>

        {/* Total */}
        <div className="text-right text-xl font-bold">
          Total: ${calcularTotal().toFixed(0)}
        </div>

        {/* Pago */}

         <div className="flex flex-col">
            <label className="text-sm font-semibold mb-1 text-gray-500">
              Medio de Pago
            </label>
            <select
              className="border p-2 rounded-lg w-full"
              onChange={e => setMetodoPago(e.target.value)}
            >
              <option>Bancolombia</option>
              <option>Nequi</option>
              <option>Crédito</option>
              <option>Daviplata</option>
            </select>

          </div>

        {/* Notas */}
        <textarea
          className="border p-2 rounded-lg w-full"
          placeholder="Notas"
          onChange={e => setNotas(e.target.value)}
        />

        <button
          onClick={generarPDF}
          className="w-full bg-green-600 text-white py-3 rounded-xl text-lg font-semibold"
        >
          Generar Factura PDF
        </button>

        <input
          type="file"
          accept=".csv"
          onChange={handleCSV}
          className="border p-2 rounded-lg"
        />


        {facturasCSV.map((f, i) => (
  <div key={i} className="border p-3 rounded-lg flex justify-between">
    <div>
      <div className="font-semibold">{f.cliente.nombre}</div>
      <div className="font-semibold">{f.orden}</div>
      <div className="text-sm text-gray-500">
        {f.items.length} productos
      </div>
    </div>

    <button
      onClick={() => generarPDFCSV(f)}
      className="bg-green-600 text-white px-3 rounded-lg"
    >
      Generar Factura
    </button>
  </div>
))}
      </div>
    </div>
  );
}
