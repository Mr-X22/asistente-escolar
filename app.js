// ---------- Estado en memoria (reflejo de lo que hay en AEStorage) ----------

let materias = [];
let calificaciones = [];
let config = {};
let contadorRubrosNuevo = 0;

const CONFIG_VACIA = {
    alumno: "",
    universidad: "",
    facultad: "",
    modalidad: "",
    carrera: "",
    semestre: "",
    logoUniversidad: "",
    logoFacultad: "",
    logoModalidad: ""
};

async function persistir(){
    await AEStorage.guardarDatos({ materias, calificaciones, config });
}

// ---------- Arranque ----------

async function iniciarApp(){

    const estado = await AEStorage.iniciar();
    const datos = AEStorage.obtenerDatos();

    materias = datos.materias || [];
    calificaciones = datos.calificaciones || [];
    config = { ...CONFIG_VACIA, ...(datos.config || {}) };

    actualizarBannerAlmacenamiento(estado);

    renderSelectMaterias();
    renderListaMaterias();
    document.getElementById("portadaFecha").valueAsDate = new Date();

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
        config = { ...CONFIG_VACIA, ...(datos.config || {}) };
        actualizarBannerAlmacenamiento(estado);
        renderSelectMaterias();
        renderListaMaterias();
        if(document.getElementById("vistaMaterias").classList.contains("activa")){
            renderListaMateriasConfig();
        }
        if(document.getElementById("vistaConfig").classList.contains("activa")){
            cargarFormularioConfig();
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
        config = { ...CONFIG_VACIA, ...(datos.config || {}) };
        actualizarBannerAlmacenamiento(estado);
        renderSelectMaterias();
        renderListaMaterias();
        if(document.getElementById("vistaMaterias").classList.contains("activa")){
            renderListaMateriasConfig();
        }
        if(document.getElementById("vistaConfig").classList.contains("activa")){
            cargarFormularioConfig();
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
        config = { ...CONFIG_VACIA, ...(datos.config || {}) };
        renderSelectMaterias();
        renderListaMaterias();
        renderListaMateriasConfig();
        cargarFormularioConfig();
        alert("Respaldo importado correctamente.");
    }).catch((e) => {
        alert("No se pudo leer ese archivo: " + e.message);
    });

    input.value = "";
}

// ---------- Navegación entre vistas ----------

const VISTAS = ["calcular", "materias", "portadas", "config"];

function cambiarVista(vista){

    VISTAS.forEach(v => {
        document.getElementById("vista" + capitalizar(v)).classList.remove("activa");
        document.getElementById("tab" + capitalizar(v)).classList.remove("activa");
    });

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

    if(vista === "portadas"){
        renderSelectMateriaPortada();
        actualizarAvisoConfigPortadas();
    }

    if(vista === "config"){
        cargarFormularioConfig();
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
    contadorItemsPorRubro = {};
    agregarRubro();
    actualizarSumaGlobal();
}

let contadorItemsPorRubro = {};

function agregarRubro(){

    const rid = contadorRubrosNuevo++;
    contadorItemsPorRubro[rid] = 0;

    const div = document.createElement("div");
    div.className = "rubroBlock";
    div.id = `rubro${rid}`;
    div.innerHTML = `
        <div style="display:flex; gap:8px; align-items:flex-end;">
            <div style="flex:1;">
                <label>Nombre del rubro</label>
                <input type="text" id="rubroNombre${rid}" placeholder="Ej: Exámenes, Actividades, Participación">
            </div>
            <button type="button" onclick="eliminarRubro(${rid})" style="width:44px; flex:none; background:#e53935; margin-top:5px;">✕</button>
        </div>

        <div id="itemsRubro${rid}"></div>

        <button type="button" class="secundario" onclick="agregarItemManual(${rid})">+ Examen / actividad individual</button>

        <details style="margin-top:10px;">
            <summary style="cursor:pointer; font-size:13px; color:#1565c0;">¿Son varios y valen todos igual? Generarlos automático</summary>
            <div style="display:flex; gap:8px; margin-top:8px;">
                <div style="flex:1;">
                    <label>Cuántos hay</label>
                    <input type="number" id="rubroGenCantidad${rid}" placeholder="Ej: 18">
                </div>
                <div style="flex:1;">
                    <label>% total del rubro</label>
                    <input type="number" id="rubroGenTotal${rid}" placeholder="Ej: 70">
                </div>
            </div>
            <button type="button" class="secundario" onclick="generarItemsIguales(${rid})">Generar</button>
        </details>

        <div class="sumaRubros" id="sumaRubro${rid}">Subtotal del rubro: 0%</div>
    `;

    document.getElementById("rubrosNuevo").appendChild(div);

    agregarItemManual(rid);

}

function eliminarRubro(rid){
    const bloque = document.getElementById(`rubro${rid}`);
    if(bloque) bloque.remove();
    actualizarSumaGlobal();
}

function agregarItemManual(rid){

    const iid = contadorItemsPorRubro[rid]++;

    const div = document.createElement("div");
    div.className = "filaRubro";
    div.id = `item${rid}_${iid}`;
    div.innerHTML = `
        <div>
            <label>Nombre</label>
            <input type="text" id="itemNombre${rid}_${iid}" placeholder="Ej: Examen 1" oninput="actualizarSumaGlobal()">
        </div>
        <div style="flex:0 0 90px;">
            <label>%</label>
            <input type="number" id="itemPorcentaje${rid}_${iid}" placeholder="10" oninput="actualizarSumaGlobal()">
        </div>
        <button type="button" onclick="quitarItem('${`item${rid}_${iid}`}')">✕</button>
    `;

    document.getElementById(`itemsRubro${rid}`).appendChild(div);
    actualizarSumaGlobal();

}

function quitarItem(idFila){
    const fila = document.getElementById(idFila);
    if(fila) fila.remove();
    actualizarSumaGlobal();
}

// Convierte un nombre de rubro en su forma singular aproximada,
// para nombrar los ítems generados (Exámenes -> Examen, Actividades -> Actividad).
// Es una heurística simple; si el resultado no queda perfecto, el nombre
// de cada ítem sigue siendo editable a mano.
function singularizarNombre(nombre){

    const n = nombre.trim();
    if(!n) return "Ítem";

    if(/ciones$/i.test(n)) return n.replace(/ciones$/i, "ción");
    if(/es$/i.test(n) && n.length > 3) return n.replace(/es$/i, "");
    if(/s$/i.test(n) && n.length > 3) return n.replace(/s$/i, "");

    return n;

}

function generarItemsIguales(rid){

    const cantidad = Number(document.getElementById(`rubroGenCantidad${rid}`).value);
    const total = Number(document.getElementById(`rubroGenTotal${rid}`).value);
    const nombreRubro = document.getElementById(`rubroNombre${rid}`).value.trim();
    const nombreBase = singularizarNombre(nombreRubro || "Ítem");

    if(!cantidad || cantidad < 1){
        alert("Escribe cuántos ítems hay (ej: 18).");
        return;
    }

    if(!total || total <= 0){
        alert("Escribe el % total que vale el rubro completo.");
        return;
    }

    // Limpia los ítems actuales de este rubro
    document.getElementById(`itemsRubro${rid}`).innerHTML = "";
    contadorItemsPorRubro[rid] = 0;

    // Reparte el % en partes iguales, ajustando el último para que la suma sea exacta
    const valorBase = Math.floor((total / cantidad) * 100) / 100;
    let acumulado = 0;

    for(let i = 1; i <= cantidad; i++){

        agregarItemManual(rid);
        const iid = contadorItemsPorRubro[rid] - 1;

        const esUltimo = (i === cantidad);
        const valor = esUltimo ? Math.round((total - acumulado) * 100) / 100 : valorBase;
        acumulado += valorBase;

        document.getElementById(`itemNombre${rid}_${iid}`).value = `${nombreBase} ${i}`;
        document.getElementById(`itemPorcentaje${rid}_${iid}`).value = valor;

    }

    actualizarSumaGlobal();

}

function actualizarSumaGlobal(){

    const bloques = document.querySelectorAll("#rubrosNuevo .rubroBlock");
    let sumaGlobal = 0;

    bloques.forEach(bloque => {

        const rid = bloque.id.replace("rubro","");
        const filas = bloque.querySelectorAll(".filaRubro");
        let subtotal = 0;

        filas.forEach(fila => {
            const porcentajeInput = fila.querySelector(`input[id^="itemPorcentaje"]`);
            subtotal += Number(porcentajeInput.value) || 0;
        });

        const elSubtotal = document.getElementById(`sumaRubro${rid}`);
        if(elSubtotal) elSubtotal.textContent = `Subtotal del rubro: ${subtotal}%`;

        sumaGlobal += subtotal;

    });

    const el = document.getElementById("sumaRubrosNuevo");
    el.textContent = `Suma total de la materia: ${sumaGlobal}%`;
    el.className = "sumaRubros " + (Math.abs(sumaGlobal - 100) < 0.01 ? "ok" : "mal");

}

async function guardarMateriaNueva(){

    const nombre = document.getElementById("nuevoNombre").value.trim();

    if(!nombre){
        alert("Escribe el nombre de la materia.");
        return;
    }

    const bloques = document.querySelectorAll("#rubrosNuevo .rubroBlock");
    const rubros = [];
    let sumaGlobal = 0;

    bloques.forEach(bloque => {

        const rid = bloque.id.replace("rubro","");
        const rNombre = document.getElementById(`rubroNombre${rid}`).value.trim();
        const filas = bloque.querySelectorAll(".filaRubro");
        const items = [];

        filas.forEach(fila => {
            const nombreInput = fila.querySelector(`input[id^="itemNombre"]`);
            const porcentajeInput = fila.querySelector(`input[id^="itemPorcentaje"]`);
            const iNombre = nombreInput.value.trim();
            const iPorcentaje = Number(porcentajeInput.value) || 0;

            if(iNombre && iPorcentaje > 0){
                items.push({nombre: iNombre, porcentaje: iPorcentaje});
                sumaGlobal += iPorcentaje;
            }
        });

        if(rNombre && items.length > 0){
            rubros.push({nombre: rNombre, items});
        }

    });

    if(rubros.length === 0){
        alert("Agrega al menos un rubro con un ítem de evaluación.");
        return;
    }

    if(Math.abs(sumaGlobal - 100) >= 0.01){
        const continuar = confirm(`Todo lo que agregaste suma ${sumaGlobal}%, no 100%. ¿Guardar de todas formas?`);
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

// Compatibilidad: materias guardadas antes de este cambio traían
// {nombre, porcentaje} plano en vez de {nombre, items:[...]}
function obtenerItemsRubro(rubro){
    if(rubro.items) return rubro.items;
    return [{ nombre: rubro.nombre, porcentaje: rubro.porcentaje }];
}

function renderListaMateriasConfig(){

    const cont = document.getElementById("listaMateriasConfig");

    if(materias.length === 0){
        cont.innerHTML = `<div class="vacio">Aún no has registrado materias.</div>`;
        return;
    }

    let html = "";

    materias.forEach(m => {

        const detalleRubros = m.rubros.map(r => {
            const items = obtenerItemsRubro(r);
            const totalRubro = items.reduce((acc, it) => acc + it.porcentaje, 0);
            const detalleItems = items.map(it => `${it.nombre} (${it.porcentaje}%)`).join(", ");
            return `<b>${r.nombre}</b> — ${totalRubro}% total: ${detalleItems}`;
        }).join("<br>");

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

    materia.rubros.forEach((rubro,rIndex)=>{

        const items = obtenerItemsRubro(rubro);
        const totalRubro = items.reduce((acc, it) => acc + it.porcentaje, 0);

        html += `<div class="card"><h3>${rubro.nombre} (${totalRubro}%)</h3>`;

        items.forEach((item, iIndex) => {
            html += `
            <label>${item.nombre} (${item.porcentaje}%)</label>
            <input
            type="number"
            inputmode="numeric"
            step="0.1"
            id="calif_${rIndex}_${iIndex}"
            placeholder="Calificación obtenida (0-10)">
            `;
        });

        html += `</div>`;

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

    rubros.forEach((rubro,rIndex)=>{

        const items = obtenerItemsRubro(rubro);
        const totalRubro = items.reduce((acc, it) => acc + it.porcentaje, 0);

        let detalleItems = "";
        let aporteRubro = 0;

        items.forEach((item, iIndex) => {

            const calif = Number(document.getElementById(`calif_${rIndex}_${iIndex}`).value) || 0;
            const aporte = (calif / 10) * item.porcentaje;

            aporteRubro += aporte;
            porcentajeFinal += aporte;

            detalleItems += `${item.nombre}: ${calif}/10 → aporta ${aporte.toFixed(2)}%<br>`;

        });

        detalle += `
        <b>${rubro.nombre}</b> (${totalRubro}% del total)<br>
        ${detalleItems}
        Subtotal del rubro: ${aporteRubro.toFixed(2)}%<br><br>
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

// ---------- Configuración ----------

function cargarFormularioConfig(){
    document.getElementById("cfgAlumno").value = config.alumno || "";
    document.getElementById("cfgUniversidad").value = config.universidad || "";
    document.getElementById("cfgFacultad").value = config.facultad || "";
    document.getElementById("cfgModalidad").value = config.modalidad || "";
    document.getElementById("cfgCarrera").value = config.carrera || "";
    document.getElementById("cfgSemestre").value = config.semestre || "";

    actualizarPreviewLogo("logoUniversidad");
    actualizarPreviewLogo("logoFacultad");
    actualizarPreviewLogo("logoModalidad");
}

function actualizarPreviewLogo(clave){
    const img = document.getElementById("preview" + capitalizar(clave));
    if(config[clave]){
        img.src = config[clave];
        img.style.display = "block";
    }else{
        img.style.display = "none";
    }
}

function subirLogo(input, clave){

    const file = input.files[0];
    if(!file) return;

    const lector = new FileReader();
    lector.onload = () => {
        config[clave] = lector.result;
        actualizarPreviewLogo(clave);
    };
    lector.readAsDataURL(file);

}

async function guardarConfiguracion(){

    config.alumno = document.getElementById("cfgAlumno").value.trim();
    config.universidad = document.getElementById("cfgUniversidad").value.trim();
    config.facultad = document.getElementById("cfgFacultad").value.trim();
    config.modalidad = document.getElementById("cfgModalidad").value.trim();
    config.carrera = document.getElementById("cfgCarrera").value.trim();
    config.semestre = document.getElementById("cfgSemestre").value.trim();

    await persistir();
    alert("Configuración guardada.");

}

// ---------- Portadas ----------

function renderSelectMateriaPortada(){

    const select = document.getElementById("portadaMateria");
    const valorActual = select.value;

    let html = `<option value="">Seleccione...</option>`;

    materias.forEach(m => {
        html += `<option value="${m.id}">${m.nombre}</option>`;
    });

    select.innerHTML = html;
    select.value = valorActual;

    actualizarProfesorPortada();

}

function actualizarProfesorPortada(){

    const materiaId = document.getElementById("portadaMateria").value;
    const campo = document.getElementById("portadaProfesor");

    if(!materiaId){
        campo.value = "";
        return;
    }

    const materia = materias.find(m => m.id === materiaId);
    campo.value = materia && materia.profesor ? materia.profesor : "(sin profesor registrado en esta materia)";

}

function actualizarAvisoConfigPortadas(){

    const faltan = !config.alumno || !config.universidad || !config.facultad;
    document.getElementById("avisoConfigPortadas").style.display = faltan ? "block" : "none";

}

function generarPortada(){

    const materiaId = document.getElementById("portadaMateria").value;

    if(!materiaId){
        alert("Selecciona una materia primero.");
        return;
    }

    const materia = materias.find(m => m.id === materiaId);
    const unidad = document.getElementById("portadaUnidad").value || "0";
    const actividad = document.getElementById("portadaActividad").value || "0";
    const fecha = document.getElementById("portadaFecha").value;

    document.title = `A${actividad} U${unidad} ${config.alumno || "Portada"}`;

    document.getElementById("pf-logoUniversidad").src = config.logoUniversidad || "";
    document.getElementById("pf-logoFacultad").src = config.logoFacultad || "";
    document.getElementById("pf-logoModalidad").src = config.logoModalidad || "";

    document.getElementById("pf-universidad").innerText = config.universidad || "";
    document.getElementById("pf-facultad").innerText = config.facultad || "";
    document.getElementById("pf-modalidad").innerText = config.modalidad || "";

    document.getElementById("pf-alumno").innerText = "Alumno: " + (config.alumno || "");
    document.getElementById("pf-materia").innerText = materia.nombre.toLowerCase();
    document.getElementById("pf-profesor").innerText = materia.profesor || "";

    if(fecha){
        const p = fecha.split("-");
        document.getElementById("pf-fecha").innerText = `${p[2]}/${p[1]}/${p[0]}`;
    }else{
        document.getElementById("pf-fecha").innerText = "";
    }

    document.getElementById("pf-actividad").innerText = `Actividad #${actividad} Unidad ${unidad}`;

    document.getElementById("portada-final").style.display = "flex";

    setTimeout(() => {
        window.print();
        document.title = "Tu Asistente Escolar";
    }, 200);

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
