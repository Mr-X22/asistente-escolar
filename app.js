// ---------- Estado en memoria (reflejo de lo que hay en AEStorage) ----------

let materias = [];
let calificaciones = [];
let contadorRubrosNuevo = 0;

async function persistir(){
    await AEStorage.guardarDatos({ materias, calificaciones });
}

// ---------- Arranque ----------

async function iniciarApp(){

    const estado = await AEStorage.iniciar();
    const datos = AEStorage.obtenerDatos();

    materias = datos.materias || [];
    calificaciones = datos.calificaciones || [];

    actualizarBannerAlmacenamiento(estado);

    renderSelectMaterias();
    renderListaMaterias();

}

function actualizarBannerAlmacenamiento(estado){

    const banner = document.getElementById("bannerAlmacenamiento");

    if(estado.modo === "archivo"){
        banner.innerHTML = `📁 Guardando en tu archivo local. <button class="linkBtn" onclick="AEStorage.exportarComoDescarga()">Descargar copia</button>`;
        banner.className = "banner ok";
        return;
    }

    if(!AEStorage.soportaFS){
        banner.innerHTML = `⚠️ Tu navegador no soporta archivos locales. Los datos se guardan solo en este navegador. <button class="linkBtn" onclick="AEStorage.exportarComoDescarga()">Descargar respaldo</button>`;
        banner.className = "banner aviso";
        return;
    }

    banner.innerHTML = `
        💾 Aún no conectas un archivo de datos.
        <button class="linkBtn" onclick="conectarNuevoArchivo()">Crear archivo</button>
        <button class="linkBtn" onclick="conectarArchivoExistente()">Abrir uno existente</button>
    `;
    banner.className = "banner aviso";

}

async function conectarNuevoArchivo(){
    try{
        const estado = await AEStorage.crearArchivoNuevo();
        const datos = AEStorage.obtenerDatos();
        materias = datos.materias || [];
        calificaciones = datos.calificaciones || [];
        actualizarBannerAlmacenamiento(estado);
        renderSelectMaterias();
        renderListaMaterias();
        if(document.getElementById("vistaMaterias").classList.contains("activa")){
            renderListaMateriasConfig();
        }
    }catch(e){
        if(e.name !== "AbortError") alert("No se pudo crear el archivo: " + e.message);
    }
}

async function conectarArchivoExistente(){
    try{
        const estado = await AEStorage.conectarArchivoExistente();
        const datos = AEStorage.obtenerDatos();
        materias = datos.materias || [];
        calificaciones = datos.calificaciones || [];
        actualizarBannerAlmacenamiento(estado);
        renderSelectMaterias();
        renderListaMaterias();
        if(document.getElementById("vistaMaterias").classList.contains("activa")){
            renderListaMateriasConfig();
        }
    }catch(e){
        if(e.name !== "AbortError") alert("No se pudo abrir el archivo: " + e.message);
    }
}

function importarArchivoRespaldo(input){
    const file = input.files[0];
    if(!file) return;

    AEStorage.importarDesdeArchivo(file).then((datos) => {
        materias = datos.materias || [];
        calificaciones = datos.calificaciones || [];
        renderSelectMaterias();
        renderListaMaterias();
        renderListaMateriasConfig();
        alert("Respaldo importado correctamente.");
    }).catch((e) => {
        alert("No se pudo leer ese archivo: " + e.message);
    });

    input.value = "";
}

// ---------- Navegación entre vistas ----------

function cambiarVista(vista){

    document.getElementById("vistaCalcular").classList.remove("activa");
    document.getElementById("vistaMaterias").classList.remove("activa");
    document.getElementById("tabCalcular").classList.remove("activa");
    document.getElementById("tabMaterias").classList.remove("activa");

    document.getElementById("vista" + capitalizar(vista)).classList.add("activa");
    document.getElementById("tab" + capitalizar(vista)).classList.add("activa");

    if(vista === "materias"){
        renderListaMateriasConfig();
        resetFormularioNuevaMateria();
    }

    if(vista === "calcular"){
        renderSelectMaterias();
        renderListaMaterias();
    }

}

function capitalizar(s){
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- Gestión de materias (alta) ----------

function resetFormularioNuevaMateria(){
    document.getElementById("nuevoNombre").value = "";
    document.getElementById("nuevoProfesor").value = "";
    document.getElementById("nuevoSalon").value = "";
    document.getElementById("nuevoHorario").value = "";
    document.getElementById("rubrosNuevo").innerHTML = "";
    contadorRubrosNuevo = 0;
    agregarFilaRubro();
    agregarFilaRubro();
    actualizarSumaRubrosNuevo();
}

function agregarFilaRubro(){

    const id = contadorRubrosNuevo++;

    const div = document.createElement("div");
    div.className = "filaRubro";
    div.id = `filaRubro${id}`;
    div.innerHTML = `
        <div>
            <label>Rubro</label>
            <input type="text" id="rubroNombre${id}" placeholder="Ej: Exámenes parciales" oninput="actualizarSumaRubrosNuevo()">
        </div>
        <div style="flex:0 0 90px;">
            <label>%</label>
            <input type="number" id="rubroPorcentaje${id}" placeholder="30" oninput="actualizarSumaRubrosNuevo()">
        </div>
        <button type="button" onclick="quitarFilaRubro(${id})">✕</button>
    `;

    document.getElementById("rubrosNuevo").appendChild(div);

}

function quitarFilaRubro(id){
    const fila = document.getElementById(`filaRubro${id}`);
    if(fila) fila.remove();
    actualizarSumaRubrosNuevo();
}

function actualizarSumaRubrosNuevo(){

    const filas = document.querySelectorAll("#rubrosNuevo .filaRubro");
    let suma = 0;

    filas.forEach(fila => {
        const idAttr = fila.id.replace("filaRubro","");
        const porcentaje = Number(document.getElementById(`rubroPorcentaje${idAttr}`).value) || 0;
        suma += porcentaje;
    });

    const el = document.getElementById("sumaRubrosNuevo");
    el.textContent = `Suma: ${suma}%`;
    el.className = "sumaRubros " + (suma === 100 ? "ok" : "mal");

}

async function guardarMateriaNueva(){

    const nombre = document.getElementById("nuevoNombre").value.trim();

    if(!nombre){
        alert("Escribe el nombre de la materia.");
        return;
    }

    const filas = document.querySelectorAll("#rubrosNuevo .filaRubro");
    const rubros = [];
    let suma = 0;

    filas.forEach(fila => {
        const idAttr = fila.id.replace("filaRubro","");
        const rNombre = document.getElementById(`rubroNombre${idAttr}`).value.trim();
        const rPorcentaje = Number(document.getElementById(`rubroPorcentaje${idAttr}`).value) || 0;

        if(rNombre && rPorcentaje > 0){
            rubros.push({nombre:rNombre, porcentaje:rPorcentaje});
            suma += rPorcentaje;
        }
    });

    if(rubros.length === 0){
        alert("Agrega al menos un rubro de evaluación.");
        return;
    }

    if(suma !== 100){
        const continuar = confirm(`Los rubros suman ${suma}%, no 100%. ¿Guardar de todas formas?`);
        if(!continuar) return;
    }

    materias.push({
        id: Date.now().toString(36),
        nombre,
        profesor: document.getElementById("nuevoProfesor").value.trim(),
        salon: document.getElementById("nuevoSalon").value.trim(),
        horario: document.getElementById("nuevoHorario").value.trim(),
        rubros
    });

    await persistir();
    resetFormularioNuevaMateria();
    renderListaMateriasConfig();

}

async function eliminarMateria(id){

    const usada = calificaciones.some(c => c.materiaId === id);

    if(usada){
        const continuar = confirm("Esta materia ya tiene una calificación guardada. Si la eliminas, también se borrará esa calificación. ¿Continuar?");
        if(!continuar) return;
        calificaciones = calificaciones.filter(c => c.materiaId !== id);
    }

    materias = materias.filter(m => m.id !== id);
    await persistir();
    renderListaMateriasConfig();

}

function renderListaMateriasConfig(){

    const cont = document.getElementById("listaMateriasConfig");

    if(materias.length === 0){
        cont.innerHTML = `<div class="vacio">Aún no has registrado materias.</div>`;
        return;
    }

    let html = "";

    materias.forEach(m => {

        const detalleRubros = m.rubros.map(r => `${r.nombre} (${r.porcentaje}%)`).join(" · ");

        html += `
        <div class="materiaItem">
            <b>${m.nombre}</b>
            <div class="meta">${[m.profesor, m.salon, m.horario].filter(Boolean).join(" · ") || "Sin datos adicionales"}</div>
            <div class="meta">${detalleRubros}</div>
            <div class="acciones">
                <button class="peligro" onclick="eliminarMateria('${m.id}')">Eliminar</button>
            </div>
        </div>
        `;

    });

    cont.innerHTML = html;

}

// ---------- Calculadora ----------

function renderSelectMaterias(){

    const select = document.getElementById("materia");
    const valorActual = select.value;

    let html = `<option value="">Seleccione...</option>`;

    materias.forEach(m => {
        html += `<option value="${m.id}">${m.nombre}</option>`;
    });

    select.innerHTML = html;
    select.value = valorActual;

    if(!select.value){
        document.getElementById("formulario").innerHTML = "";
    }

}

function cargarMateria(){

    const materiaId = document.getElementById("materia").value;

    if(!materiaId){
        document.getElementById("formulario").innerHTML = "";
        return;
    }

    const materia = materias.find(m => m.id === materiaId);

    let html = "";

    materia.rubros.forEach((rubro,index)=>{

        html += `

        <div class="card">

        <h3>${rubro.nombre} (${rubro.porcentaje}%)</h3>

        <label>Cantidad</label>
        <input
        type="number"
        inputmode="numeric"
        id="cantidad${index}"
        placeholder="Ejemplo: 10">

        <label>Puntos obtenidos</label>
        <input
        type="number"
        inputmode="numeric"
        id="obtenidos${index}"
        placeholder="Ejemplo: 85">

        </div>

        `;

    });

    html += `

    <button onclick="calcular()">🧮 Calcular</button>

    <div id="resultado"></div>

    `;

    document.getElementById("formulario").innerHTML = html;

}

function calificacionOficial(nota){

    if(nota >= 9.60) return 10;
    if(nota >= 8.60) return 9;
    if(nota >= 7.60) return 8;
    if(nota >= 6.60) return 7;
    if(nota >= 6.00) return 6;

    return 5;

}

function calcular(){

    const materiaId = document.getElementById("materia").value;
    const materia = materias.find(m => m.id === materiaId);
    const rubros = materia.rubros;

    let porcentajeFinal = 0;
    let detalle = "";

    rubros.forEach((rubro,index)=>{

        const cantidad =
        Number(document.getElementById(`cantidad${index}`).value);

        const obtenidos =
        Number(document.getElementById(`obtenidos${index}`).value);

        const maximo = cantidad * 10;

        const porcentaje =
        maximo > 0 ? (obtenidos / maximo) * 100 : 0;

        const aporte =
        porcentaje * (rubro.porcentaje/100);

        porcentajeFinal += aporte;

        detalle += `
        <b>${rubro.nombre}</b><br>
        ${obtenidos}/${maximo} = ${porcentaje.toFixed(2)}%<br>
        Aporte: ${aporte.toFixed(2)}<br><br>
        `;

    });

    const notaNumerica =
    porcentajeFinal / 10;

    const oficial =
    calificacionOficial(notaNumerica);

    document.getElementById("resultado").innerHTML = `

    <div class="resultado">

    ${detalle}

    <hr>

    <b>Porcentaje Final:</b>
    ${porcentajeFinal.toFixed(2)}%

    <br><br>

    <b>Nota Numérica:</b>
    ${notaNumerica.toFixed(2)}

    <br><br>

    <b>Calificación Oficial:</b>
    ${oficial}

    <br><br>

    <button onclick="guardarCalificacion('${materiaId}', ${oficial})">
    💾 Guardar Calificación
    </button>

    </div>

    `;

}

async function guardarCalificacion(materiaId, calificacion){

    calificaciones = calificaciones.filter(c => c.materiaId !== materiaId);

    calificaciones.push({
        materiaId,
        calificacion,
        fecha: new Date().toISOString()
    });

    await persistir();
    renderListaMaterias();

}

async function eliminarCalificacion(materiaId){
    calificaciones = calificaciones.filter(c => c.materiaId !== materiaId);
    await persistir();
    renderListaMaterias();
}

function renderListaMaterias(){

    const cont = document.getElementById("listaMaterias");

    if(calificaciones.length === 0){
        cont.innerHTML = `<div class="vacio">Aún no has guardado calificaciones.</div>`;
        document.getElementById("promedioGeneral").innerHTML = "";
        return;
    }

    let html = "";
    let suma = 0;

    calificaciones.forEach(c => {

        const materia = materias.find(m => m.id === c.materiaId);
        const nombre = materia ? materia.nombre : "Materia eliminada";

        suma += c.calificacion;

        html += `
        <div class="materiaGuardada">
            <div class="info">${nombre}</div>
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="nota">${c.calificacion}</div>
                <button class="peligro" style="width:auto; margin:0; padding:8px 10px; font-size:13px;" onclick="eliminarCalificacion('${c.materiaId}')">✕</button>
            </div>
        </div>
        `;

    });

    cont.innerHTML = html;

    const promedio = suma / calificaciones.length;

    document.getElementById("promedioGeneral").innerHTML =
    `Promedio General: ${promedio.toFixed(2)}`;

}

// ---------- Instalación PWA ----------

let promptDiferido = null;

window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    promptDiferido = evento;
    document.getElementById("botonInstalar").style.display = "block";
});

document.getElementById("botonInstalar").addEventListener("click", async () => {
    if(!promptDiferido) return;
    promptDiferido.prompt();
    await promptDiferido.userChoice;
    promptDiferido = null;
    document.getElementById("botonInstalar").style.display = "none";
});

window.addEventListener("appinstalled", () => {
    document.getElementById("botonInstalar").style.display = "none";
});

// ---------- Service worker ----------

if("serviceWorker" in navigator){
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch((e) => {
            console.warn("No se pudo registrar el service worker:", e);
        });
    });
}

// ---------- Arranque ----------

iniciarApp();
