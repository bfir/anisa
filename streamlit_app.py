import requests 
import streamlit as st 
API = "http://127.0.0.1:8000"

st.set_page_config(page_title="Anisa", layout="wide")
st.title("Anisa: atención al Paciente Internacional")

with st.sidebar:
    st.header("Vista del servicio")
    
    dias = st.slider("Citas en los próximos días", 1, 30, 7)
    proximas = requests.get(f"{API}/citas/proximas", params={"dias": dias}).json()
    st.subheader(f"Citas próximas ({len(proximas)})")
    for c in proximas:
        st.write(f" - {c['fecha']} . {c['especialidad']} . {c['paciente_nombre']}")
    pendientes = requests.get(f"{API}/pagos/pendientes").json()
    st.subheader(f"Pagos pendientes ({len(pendientes)})")
    for p in pendientes[:10]:
        st.write(f" - {p['paciente_nombre']}: {p['importe']:.2f} € ({p['concepto']})")

nombre = st.text_input("Buscar paciente para empezar")

if not nombre:
    st.info("Escribe un nombre para empezar.")
    st.stop()
pacientes = requests.get(f"{API}/pacientes/buscar", params={"nombre": nombre}).json()
if not pacientes:
    st.warning("Ningún paciente coincide.")
    st.stop()
    
etiquetas = {f"{p['nombre']} (#{p['id']})": p for p in pacientes}
elegida = st.selectbox("Resultados", list(etiquetas))
paciente = etiquetas[elegida]

st.header(paciente["nombre"])
c1, c2, c3, c4 = st.columns(4)
c1.metric("Idioma", paciente["idioma"])
c2.metric("País", paciente["pais"])
c3.metric("Aseguradora", paciente["aseguradora"])
tab_citas, tab_mensajes, tab_enviar = st.tabs(["Citas", "Mensajes", "Enviar mensaje"])

with tab_citas:
    citas = requests.get(f"{API}/pacientes/{paciente['id']}/citas").json()
    if citas:
        st.dataframe(citas, use_container_width=True)
    else:
        st.write("Sin citas.")
        
with tab_mensajes:
    mensajes = requests.get(f"{API}/pacientes/{paciente['id']}/mensajes").json()
    if mensajes:
        st.dataframe(mensajes, use_container_width=True)
    else:
        st.write("Sin mensajes.")

with tab_enviar:
    idiomas = ["es", "en", "ar", "fr"]
    idioma_defecto= idiomas.index(paciente["idioma"]) if paciente["idioma"] in idiomas else 0    
    
    with st.form("enviar_mensaje"):
        tipo= st.selectbox("Tipo", ["recordatorio_cita", "pago_pendiente", "informativo"])
        idioma = st.selectbox("Idioma", idiomas, index=idioma_defecto)
        texto= st.text_area("Texto del mensaje")
        enviar = st.form_submit_button("Enviar")
    
    if enviar:
        respuesta = requests.post(
            f"{API}/mensajes",
            json={
                "paciente_id": paciente["id"],
                "tipo": tipo,
                "idioma": idioma,
                "texto":texto,
            },
        )
        if respuesta.status_code == 200:
            st.success("Mensaje enviado y registrado.")
        else:
            st.error(f"Error: {respuesta.text}")