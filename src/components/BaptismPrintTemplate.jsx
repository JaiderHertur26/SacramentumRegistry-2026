import React, { forwardRef } from 'react';
import { 
    convertDateToSpanishText, 
    convertNumberToSpanishWords,
    convertMonthToSpanishWords,
    convertYearToSpanishWords 
} from '@/utils/dateTimeFormatters';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { getActivePriest } from '@/utils/getActivePriest';
import { dateToSpanishLegalText } from '@/utils/dateToSpanishLegalText.js';

const BaptismPrintTemplate = forwardRef((props, ref) => {
  const { user } = useAuth();
  const { 
    getParrocos, 
    generarNotaAlMargenAnulada, 
    generarNotaAlMargenNuevaPartida, 
    generarNotaAlMargenEstandar,
    getBaptismCorrections,
    getConceptosAnulacion,
    obtenerNotasAlMargen
  } = useAppData();

  const parrocos = user?.parishId ? getParrocos(user.parishId) : [];
  const activePriestName = getActivePriest(parrocos);
  const conceptos = user?.parishId ? getConceptosAnulacion(user.parishId) : [];
  const notasAlMargenTemplates = obtenerNotasAlMargen(user?.parishId);

  // Defensive: Try to use props.data if it exists (normalized object), otherwise fallback to individual props
  const dataSource = props.data || props;

  const {
    libro,
    folio,
    numero,
    lugarBautismoDetalle,
    fechaBautismo,
    apellidos,
    nombres,
    fechaNacimiento,
    lugarNacimientoDetalle,
    sexo,
    nombrePadre,
    cedulaPadre,
    nombreMadre,
    cedulaMadre,
    abuelosPaternos,
    abuelosMaternos,
    padrinos,
    ministro,
    notaAlMargen,
    // Civil Registry Data
    registrySerial,
    registryDate,
    // If the data object has enriched parroquiaInfo, use it. Otherwise fallback to props.
    parroquiaInfo = {},
    conceptoAnulacionId
  } = dataSource;

  const finalParrocoName = activePriestName;
  
  const finalParroquiaInfo = {
      ...(props.parroquiaInfo || {}), // Props base
      ...parroquiaInfo // Enriched data override
  };

  const {
    nombre: nombreParroquia = '',
    direccion: direccionParroquia = '',
    telefono: telefonoParroquia = '',
    email: emailParroquia = '',
    ciudad: ciudadParroquia = '',
    departamento: departamentoParroquia = '',
    diocesis: diocesisFromParishInfo = ''
  } = finalParroquiaInfo;

  const ubicacion = [ciudadParroquia, departamentoParroquia].filter(Boolean).join(', ');

  const getText = (v) => v || '---';
  
  const formatDate = (d) => {
      try {
          return convertDateToSpanishText(d);
      } catch (e) {
          console.error("Error formatting date for print:", d, e);
          return d || '---';
      }
  };

  // Logic to generate the dynamic marginal note text
  const generateMarginalNote = () => {
      let resultText = "";
      const currentSpanishDate = dateToSpanishLegalText(new Date());

      // 1. Check if this baptism is involved in a correction decree (either as original or new)
      if (dataSource.id) {
          const corrections = getBaptismCorrections(user?.parishId) || [];
          
          // Case A: This is the original annulled partida
          const decreeAsOriginal = corrections.find(c => String(c.originalPartidaId) === String(dataSource.id));
          if (decreeAsOriginal) {
              const newPartidaSummary = decreeAsOriginal.newPartidaSummary || {};
              const newPartidaData = {
                  libro: newPartidaSummary.book || newPartidaSummary.book_number || '___',
                  folio: newPartidaSummary.page || newPartidaSummary.page_number || '___',
                  numero: newPartidaSummary.entry || newPartidaSummary.entry_number || '___'
              };
              const decreeData = {
                  numero: decreeAsOriginal.decreeNumber,
                  fecha: decreeAsOriginal.decreeDate
              };
              resultText = generarNotaAlMargenAnulada(newPartidaData, decreeData, user?.parishId);
          }
          // Case B: This is the new partida created by correction
          else {
            const decreeAsNew = corrections.find(c => String(c.newPartidaId) === String(dataSource.id));
            if (decreeAsNew) {
                const originalPartidaSummary = decreeAsNew.originalPartidaSummary || {};
                const partidaAnulada = {
                    libro: originalPartidaSummary.book || originalPartidaSummary.book_number || '___',
                    folio: originalPartidaSummary.page || originalPartidaSummary.page_number || '___',
                    numero: originalPartidaSummary.entry || originalPartidaSummary.entry_number || '___'
                };
                const decreeData = {
                    numero: decreeAsNew.decreeNumber,
                    fecha: decreeAsNew.decreeDate,
                    oficina: 'Cancillería' // Can be enhanced if we store office in decree
                };
                
                // We try to find the concept to see if it has specific office info, though not strictly required by prompt
                const concept = conceptos.find(c => c.id === decreeAsNew.conceptoAnulacionId);
                if (concept && concept.expide) {
                    decreeData.oficina = concept.expide;
                }

                resultText = generarNotaAlMargenNuevaPartida(partidaAnulada, decreeData, activePriestName, user?.parishId);
            }
          }
      }

      // 2. Fallback: Manual Concept Selection (for preview before saving) or Legacy Data
      if (!resultText && conceptoAnulacionId) {
          const concept = conceptos.find(c => c.id === conceptoAnulacionId);
          if (concept) {
              const { notaAlMargenId } = concept;
              
              // If we are previewing and don't have decree data in 'corrections' yet, 
              // we might have it in props or dataSource from the form state.
              if (dataSource.previewDecreeData) {
                   const { decreeData, relatedPartidaData, isAnnulled } = dataSource.previewDecreeData;
                   if (isAnnulled) {
                       resultText = generarNotaAlMargenAnulada(relatedPartidaData, decreeData, user?.parishId);
                   } else {
                       resultText = generarNotaAlMargenNuevaPartida(relatedPartidaData, decreeData, activePriestName, user?.parishId);
                   }
              }

              if (!resultText && notaAlMargenId === 'estandar') {
                   resultText = generarNotaAlMargenEstandar(user?.parishId);
              }
          }
      }

      // 3. Fallback: Check status flags (Legacy compatibility)
      if (!resultText && dataSource.status === 'anulada') {
          // Minimal fallback if decree lookup failed but status is set
          resultText = "PARTIDA ANULADA. (Consulte el archivo de decretos para más detalles).";
      }

      // 4. Standard Marginal Note or Default
      if (!resultText) {
          resultText = generarNotaAlMargenEstandar(user?.parishId);
      }
      
      // 5. Hardcoded Default (Absolute fallback if even standard text is empty)
      if (!resultText) {
          const today = new Date();
          const currentDay = today.getDate();
          const currentMonth = today.getMonth() + 1; 
          const currentYear = today.getFullYear();

          const dayText = convertNumberToSpanishWords(currentDay);
          const monthText = convertMonthToSpanishWords(currentMonth);
          const yearText = convertYearToSpanishWords(currentYear);

          const locationText = ubicacion 
            ? `${ciudadParroquia}, ${departamentoParroquia}`.toUpperCase()
            : 'ESTA PARROQUIA';

          let baseText = "";

          if (notaAlMargen && notaAlMargen.trim().length > 0) {
              baseText = notaAlMargen.trim();
              if (!baseText.endsWith('.')) baseText += ". ";
              else baseText += " ";
          } else if (registrySerial) {
              const regDateFormatted = registryDate ? formatDate(registryDate) : '---';
              baseText = `REGISTRO CIVIL SERIAL No. ${registrySerial}, EXPEDIDO POR REGISTRADURÍA NACIONAL DEL ESTADO CIVIL EN FECHA ${regDateFormatted}. `;
          } else {
              baseText = "SIN NOTA MARGINAL DE MATRIMONIO HASTA LA FECHA. ";
          }

          baseText += `LA INFORMACIÓN SUMINISTRADA ES FIEL A LA CONTENIDA EN EL LIBRO. SE EXPIDE EN ${locationText} - COLOMBIA EL DÍA ${dayText} DE ${monthText} DE ${yearText}.`;
          resultText = baseText;
      }

      // FINAL: Replace dynamic placeholder with current date
      if (resultText) {
          return resultText.replace(/\[FECHA_EXPEDICION\]/g, currentSpanishDate);
      }

      return "";
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
      fontSize: '14px'
    },
    title: {
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '16px',
      marginTop: '8px'
    },
    center: { textAlign: 'center' },
    left: { marginLeft: '0.6in' },
    row: { whiteSpace: 'pre' },
    
    marginalNoteContainer: {
        marginTop: '20px',
        marginBottom: '20px',
        paddingLeft: '0.4in',
        paddingRight: '0.4in'
    },
    marginalNoteHeader: {
        textAlign: 'center',
        fontSize: '11px',
        fontWeight: 'bold',
        marginBottom: '5px'
    },
    marginalNoteContent: {
        textAlign: 'justify',
        fontSize: '11px',
        fontStyle: 'italic',
    },
    marginalNoteFooterLine: {
        textAlign: 'center',
        fontSize: '11px',
        fontWeight: 'bold',
        marginTop: '5px'
    },

    signature: {
      textAlign: 'center',
      marginTop: '30px'
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
      <div style={styles.title}>PARTIDA DE BAUTISMO</div>

      {/* REGISTRO */}
      <div style={styles.center}>
        <div style={styles.row}>{padLabel('LIBRO')} : {getText(libro)}</div>
        <div style={styles.row}>{padLabel('FOLIO')} : {getText(folio)}</div>
        <div style={styles.row}>{padLabel('NÚMERO')} : {getText(numero)}</div>
      </div>

      {/* DATOS */}
      <div style={styles.left}>
        <div style={styles.row}>{padLabel('LUGAR BAUTISMO')} : {getText(lugarBautismoDetalle)}</div>
        <div style={styles.row}>{padLabel('FECHA BAUTISMO')} : {formatDate(fechaBautismo)}</div>

        <div style={styles.row}>{padLabel('APELLIDOS')} : {getText(apellidos)}</div>
        <div style={styles.row}>{padLabel('NOMBRES')} : {getText(nombres)}</div>
        <div style={styles.row}>{padLabel('FECHA NACIMIENTO')} : {formatDate(fechaNacimiento)}</div>
        <div style={styles.row}>{padLabel('LUGAR NACIMIENTO')} : {getText(lugarNacimientoDetalle)}</div>
        <div style={styles.row}>{padLabel('SEXO')} : {getText(sexo)}</div>

        <div style={styles.row}>{padLabel('NOMBRE PADRE')} : {getText(nombrePadre)}</div>
        <div style={styles.row}>{padLabel('NOMBRE MADRE')} : {getText(nombreMadre)}</div>

        <div style={styles.row}>{padLabel('ABUELOS PATERNOS')} : {getText(abuelosPaternos)}</div>
        <div style={styles.row}>{padLabel('ABUELOS MATERNOS')} : {getText(abuelosMaternos)}</div>
        <div style={styles.row}>{padLabel('PADRINOS')} : {getText(padrinos)}</div>

        <div style={styles.row}>{padLabel('MINISTRO')} : {getText(ministro)}</div>
        <div style={styles.row}>{padLabel('DA FE')} : {finalParrocoName}</div>
      </div>

      {/* NOTA MARGINAL */}
      <div style={styles.marginalNoteContainer}>
          <div style={styles.marginalNoteHeader}>
            - - - - - - - - - - - - - - - - - NOTA AL MARGEN - - - - - - - - - - - - - - - - -
          </div>
          <div style={styles.marginalNoteContent}>
              {generateMarginalNote()}
          </div>
          <div style={styles.marginalNoteFooterLine}>
            - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
          </div>
      </div>

      {/* FIRMA */}
      <div style={styles.signature}>
        {finalParrocoName}<br />
        <strong>{props.cargo || 'PÁRROCO'}</strong>
      </div>

      {/* PIE */}
      <div style={styles.footer}>
        {direccionParroquia ? `${direccionParroquia} ` : ''}
        {telefonoParroquia ? `· Tel. ${telefonoParroquia}` : ''}
        <br />
        {emailParroquia}
      </div>
    </div>
  );
});

BaptismPrintTemplate.displayName = 'BaptismPrintTemplate';
export default BaptismPrintTemplate;