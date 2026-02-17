
import React, { forwardRef } from 'react';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { getActivePriest } from '@/utils/getActivePriest';

const ConfirmationPrintTemplate = forwardRef((props, ref) => {
  const { user } = useAuth();
  const { 
    getParrocos, 
    generarNotaAlMargenAnulada, 
    generarNotaAlMargenNuevaPartida,
    generarNotaAlMargenEstandar,
    getConceptosAnulacion,
    obtenerNotasAlMargen
  } = useAppData();

  const parrocos = user?.parishId ? getParrocos(user.parishId) : [];
  const activePriestName = getActivePriest(parrocos);
  const conceptos = user?.parishId ? getConceptosAnulacion(user.parishId) : [];
  const notasAlMargenTemplates = obtenerNotasAlMargen(user?.parishId);

  const {
    libro,
    folio,
    numero,
    lugarConfirmacionDetalle,
    lugarConfirmacion,
    sacramentPlace,
    fechaConfirmacion,
    apellidos,
    nombres,
    fechaNacimiento,
    sexo,
    sex, // Receives raw 'sex' property
    nombrePadre,
    nombreMadre,
    padrinos,
    ministro,
    notaAlMargen,
    parroquiaInfo = {},
    status,
    annulmentDate,
    decreeDate,
    newFolio,
    newPage,
    newNumber,
    newEntry,
    newPartidaRef,
    isSupplementary,
    correctionDecreeRef,
    originalPartidaRef,
    conceptoAnulacionId
  } = props;

  const {
    nombre: nombreParroquia = '',
    direccion: direccionParroquia = '',
    telefono: telefonoParroquia = '',
    email: emailParroquia = '',
    ciudad: ciudadParroquia = '',
    departamento: departamentoParroquia = '',
    diocesis: diocesisFromParishInfo = ''
  } = parroquiaInfo;

  const finalParrocoName = activePriestName;
  const ubicacion = [ciudadParroquia, departamentoParroquia].filter(Boolean).join(', ');

  const getText = (v) => v || '---';
  const formatDate = (d) => convertDateToSpanishText(d);

  // Helper to normalize sex values, handling codes (1/2) and text (M/F)
  const normalizeSex = (val) => {
    if (!val) return null;
    const s = String(val).toUpperCase().trim();
    
    // Check for specific codes or starting characters
    if (s === '1' || s.startsWith('M')) return 'MASCULINO';
    if (s === '2' || s.startsWith('F')) return 'FEMENINO';
    
    return s; // Return original if no match (e.g., fully typed words)
  };

  const getGenderDisplay = () => {
    // Check 'sex' first (raw data), then 'sexo' (potentially pre-processed)
    const rawValue = sex || sexo;
    const normalized = normalizeSex(rawValue);
    
    // Only return 'NO ESPECIFICADO' if we truly have no value
    if (!normalized) return 'NO ESPECIFICADO';
    
    return normalized;
  };

  const getConfirmationPlace = () => {
    // Priority: Detail field -> General field -> Legacy field -> Current Parish Name
    const place = lugarConfirmacionDetalle || lugarConfirmacion || sacramentPlace;
    if (place) return place.toUpperCase();
    return nombreParroquia ? nombreParroquia.toUpperCase() : '---';
  };

  const getMarginalNote = () => {
      // Priority 0: Concepto de Anulación
      if (conceptoAnulacionId) {
          const concept = conceptos.find(c => c.id === conceptoAnulacionId);
          if (concept) {
              const { notaAlMargenId } = concept;

              // Data helpers
              const getAnuladaData = () => ({
                   decreeData: { 
                      fecha: annulmentDate || decreeDate,
                      numero: props.annulmentDecree || '___'
                   },
                   newPartidaData: { 
                      libro: props.newBook || props.newLibro || newPartidaRef?.libro || '___',
                      folio: newFolio || newPage || newPartidaRef?.folio || '___', 
                      numero: newNumber || newEntry || newPartidaRef?.numero || '___'
                   }
              });

              const getNuevaData = () => {
                   if (!originalPartidaRef) return null;
                   return {
                       partidaAnulada: {
                          libro: originalPartidaRef.libro || originalPartidaRef.book || '___',
                          folio: originalPartidaRef.folio || originalPartidaRef.page || '___',
                          numero: originalPartidaRef.numero || originalPartidaRef.entry || '___'
                       },
                       decretoData: {
                          numero: correctionDecreeRef,
                          fecha: props.correctionDecreeDate, 
                          oficina: concept.expide || 'Cancillería'
                       }
                   };
              };

              if (notaAlMargenId === 'porCorreccion.anulada') {
                   const data = getAnuladaData();
                   return generarNotaAlMargenAnulada(data.newPartidaData, data.decreeData, user?.parishId);
              } else if (notaAlMargenId === 'porCorreccion.nuevaPartida') {
                   const data = getNuevaData();
                   if (data) return generarNotaAlMargenNuevaPartida(data.partidaAnulada, data.decretoData, activePriestName, user?.parishId);
              } else if (notaAlMargenId === 'porReposicion.nuevaPartida') {
                   return notasAlMargenTemplates?.porReposicion?.nuevaPartida || "Nota de reposición no configurada";
              } else if (notaAlMargenId === 'estandar') {
                   return generarNotaAlMargenEstandar(user?.parishId);
              }
          }
      }

       // Case 1: Anulada
       if (status === 'anulada') {
          const decreeData = { 
              fecha: annulmentDate || decreeDate,
              numero: props.annulmentDecree || '___'
          };
          const newPartidaData = { 
              libro: props.newBook || props.newLibro || newPartidaRef?.libro || '___',
              folio: newFolio || newPage || newPartidaRef?.folio || '___', 
              numero: newNumber || newEntry || newPartidaRef?.numero || '___'
          };
          return generarNotaAlMargenAnulada(newPartidaData, decreeData, user?.parishId);
       }

       // Case 2: New Partida from Correction
       if (isSupplementary && correctionDecreeRef && originalPartidaRef) {
          const partidaAnulada = {
              libro: originalPartidaRef.libro || originalPartidaRef.book || '___',
              folio: originalPartidaRef.folio || originalPartidaRef.page || '___',
              numero: originalPartidaRef.numero || originalPartidaRef.entry || '___'
          };
          const decretoData = {
              numero: correctionDecreeRef,
              fecha: props.correctionDecreeDate, 
              oficina: props.correctionDecreeOffice || 'Cancillería'
          };
          return generarNotaAlMargenNuevaPartida(partidaAnulada, decretoData, activePriestName, user?.parishId);
       }

       // Case 3: Standard
       if (!notaAlMargen || notaAlMargen === 'SIN NOTAS MARGINALES') {
           return generarNotaAlMargenEstandar(user?.parishId);
       }
       return notaAlMargen;
  };

  const padLabel = (label, width = 22) =>
    label.padEnd(width, '.');

  const styles = {
    page: {
      width: '8.5in',
      height: '11in',
      padding: '0.5in',
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '12.5px',
      lineHeight: '1.25',
      color: '#000',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    },
    header: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '14px',
      marginBottom: '0in'
    },
    title: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
      marginTop: '0in',
      marginBottom: '0in'
    },
    center: { textAlign: 'center', marginBottom: '0in' },
    left: { marginLeft: '0.6in', marginBottom: '0in' },
    row: { whiteSpace: 'pre' },
    noteBox: {
      textAlign: 'center',
      fontSize: '12px',
      marginTop: '6px',
      marginBottom: '0in',
      paddingTop: '0.005in',
      paddingBottom: '0.005in'
    },
    signature: {
      textAlign: 'center',
      marginTop: '10px',
      marginBottom: '0.005in'
    },
    footer: {
      textAlign: 'center',
      fontSize: '11px',
      marginTop: '6px'
    }
  };

  return (
    <div ref={ref} style={styles.page}>
      <style media="print">
        {`
          @page { size: letter; margin: 0; }
          body { margin: 0; }
        `}
      </style>

      {/* ENCABEZADO */}
      <div style={styles.header}>
        {diocesisFromParishInfo.toUpperCase()}<br />
        {nombreParroquia.toUpperCase()}<br />
        {ubicacion.toUpperCase()}
      </div>

      {/* TÍTULO */}
      <div style={styles.title}>PARTIDA DE CONFIRMACIÓN</div>

      {/* REGISTRO */}
      <div style={styles.center}>
        <div style={styles.row}>{padLabel('LIBRO')} : {getText(libro)}</div>
        <div style={styles.row}>{padLabel('FOLIO')} : {getText(folio)}</div>
        <div style={styles.row}>{padLabel('NÚMERO')} : {getText(numero)}</div>
      </div>

      {/* DATOS */}
      <div style={styles.left}>
        <div style={styles.row}>{padLabel('LUGAR CONFIRMACIÓN')} : {getConfirmationPlace()}</div>
        <div style={styles.row}>{padLabel('FECHA CONFIRMACIÓN')} : {formatDate(fechaConfirmacion)}</div>

        <div style={styles.row}>{padLabel('APELLIDOS')} : {getText(apellidos)}</div>
        <div style={styles.row}>{padLabel('NOMBRES')} : {getText(nombres)}</div>
        <div style={styles.row}>{padLabel('FECHA NACIMIENTO')} : {formatDate(fechaNacimiento)}</div>
        <div style={styles.row}>{padLabel('SEXO')} : {getGenderDisplay()}</div>

        <div style={styles.row}>{padLabel('NOMBRE PADRE')} : {getText(nombrePadre)}</div>
        <div style={styles.row}>{padLabel('NOMBRE MADRE')} : {getText(nombreMadre)}</div>

        <div style={styles.row}>{padLabel('PADRINOS')} : {getText(padrinos)}</div>

        <div style={styles.row}>{padLabel('MINISTRO')} : {getText(ministro)}</div>
        <div style={styles.row}>{padLabel('DA FE')} : {finalParrocoName}</div>
      </div>

      {/* NOTA AL MARGEN */}
      <div style={styles.noteBox}>
        ----------------------------------------------<br />
        <strong>NOTA AL MARGEN</strong><br />
        {getMarginalNote()}<br />
        ----------------------------------------------
      </div>

      {/* FIRMA */}
      <div style={styles.signature}>
        {finalParrocoName}<br />
        <strong>PÁRROCO</strong>
      </div>

      {/* PIE */}
      <div style={styles.footer}>
        {direccionParroquia} · Tel. {telefonoParroquia}<br />
        {emailParroquia}
      </div>
    </div>
  );
});

ConfirmationPrintTemplate.displayName = 'ConfirmationPrintTemplate';
export default ConfirmationPrintTemplate;
