import React, { forwardRef } from 'react';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { getActivePriest } from '@/utils/getActivePriest';

const MatrimonioPrintTemplate = forwardRef((props, ref) => {
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

  const { data, parroquiaInfo } = props;

  const {
    libro, folio, numero,
    book_number, page_number, entry_number,
    sacramentDate,
    place,
    groomName, groomSurname, groomFather, groomMother,
    brideName, brideSurname, brideFather, brideMother,
    minister,
    witnesses,
    notaAlMargen,
    metadata,
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
    correctionDecreeDate,
    correctionDecreeOffice,
    conceptoAnulacionId
  } = data;

  const daFe = metadata?.daFe || activePriestName; 
  
  const getMarginalNote = () => {
       // Priority 0: Concepto de Anulación
      if (conceptoAnulacionId) {
          const concept = conceptos.find(c => c.id === conceptoAnulacionId);
          if (concept) {
              const { notaAlMargenId } = concept;

               const getAnuladaData = () => ({
                   decreeData: { 
                      fecha: annulmentDate || decreeDate,
                      numero: data.annulmentDecree || '___'
                   },
                   newPartidaData: { 
                      libro: data.newBook || data.newLibro || newPartidaRef?.libro || '___',
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
                          fecha: correctionDecreeDate, 
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
              numero: data.annulmentDecree || '___'
          };
          const newPartidaData = { 
              libro: data.newBook || data.newLibro || newPartidaRef?.libro || '___',
              folio: newFolio || newPage || newPartidaRef?.folio || '___', 
              numero: newNumber || newEntry || newPartidaRef?.numero || '___'
          };
          return generarNotaAlMargenAnulada(newPartidaData, decreeData, user?.parishId);
       }

       // Case 2: New Partida from Correction
       // Relies on data props presence for now
       if (isSupplementary && correctionDecreeRef && originalPartidaRef) {
          const partidaAnulada = {
              libro: originalPartidaRef.libro || originalPartidaRef.book || '___',
              folio: originalPartidaRef.folio || originalPartidaRef.page || '___',
              numero: originalPartidaRef.numero || originalPartidaRef.entry || '___'
          };
          const decretoData = {
              numero: correctionDecreeRef,
              fecha: correctionDecreeDate, 
              oficina: correctionDecreeOffice || 'Cancillería'
          };
          return generarNotaAlMargenNuevaPartida(partidaAnulada, decretoData, activePriestName, user?.parishId);
       }

       // Case 3: Standard
       if (!notaAlMargen && (!metadata?.notaMarginal || metadata?.notaMarginal === 'SIN NOTAS MARGINALES')) {
            return generarNotaAlMargenEstandar(user?.parishId);
       }
       return notaAlMargen || metadata?.notaMarginal;
  };
  
  const finalBook = libro || book_number;
  const finalFolio = folio || page_number;
  const finalEntry = numero || entry_number;

  const {
    nombre: nombreParroquia = '',
    direccion: direccionParroquia = '',
    telefono: telefonoParroquia = '',
    email: emailParroquia = '',
    ciudad: ciudadParroquia = '',
    departamento: departamentoParroquia = '',
    diocesis: diocesisFromParishInfo = ''
  } = parroquiaInfo || {};

  const finalParrocoName = activePriestName; // Use active priest from context
  const ubicacion = [ciudadParroquia, departamentoParroquia].filter(Boolean).join(', ');

  const getText = (v) => v || '---';
  const formatDate = (d) => convertDateToSpanishText(d);
  
  const witnessNames = witnesses?.map(w => w.name).join(', ') || '---';

  const padLabel = (label, width = 22) => label.padEnd(width, '.');

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
    noteBox: {
      textAlign: 'center',
      fontSize: '12px',
      marginTop: '6px'
    },
    signature: {
      textAlign: 'center',
      marginTop: '10px'
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
      <div style={styles.title}>PARTIDA DE MATRIMONIO</div>

      {/* REGISTRO */}
      <div style={styles.center}>
        <div style={styles.row}>{padLabel('LIBRO')} : {getText(finalBook)}</div>
        <div style={styles.row}>{padLabel('FOLIO')} : {getText(finalFolio)}</div>
        <div style={styles.row}>{padLabel('NÚMERO')} : {getText(finalEntry)}</div>
      </div>

      {/* DATOS */}
      <div style={styles.left}>
        <div style={styles.row}>{padLabel('LUGAR MATRIMONIO')} : {getText(place)}</div>
        <div style={styles.row}>{padLabel('FECHA MATRIMONIO')} : {formatDate(sacramentDate)}</div>

        <div style={{ marginTop: '10px', marginBottom: '10px', fontWeight: 'bold' }}>EL NOVIO:</div>
        <div style={styles.row}>{padLabel('NOMBRES')} : {getText(groomName)}</div>
        <div style={styles.row}>{padLabel('APELLIDOS')} : {getText(groomSurname)}</div>
        <div style={styles.row}>{padLabel('PADRE')} : {getText(groomFather)}</div>
        <div style={styles.row}>{padLabel('MADRE')} : {getText(groomMother)}</div>

        <div style={{ marginTop: '10px', marginBottom: '10px', fontWeight: 'bold' }}>LA NOVIA:</div>
        <div style={styles.row}>{padLabel('NOMBRES')} : {getText(brideName)}</div>
        <div style={styles.row}>{padLabel('APELLIDOS')} : {getText(brideSurname)}</div>
        <div style={styles.row}>{padLabel('PADRE')} : {getText(brideFather)}</div>
        <div style={styles.row}>{padLabel('MADRE')} : {getText(brideMother)}</div>

        <div style={{ marginTop: '10px' }}></div>
        <div style={styles.row}>{padLabel('TESTIGOS')} : {witnessNames}</div>
        <div style={styles.row}>{padLabel('MINISTRO')} : {getText(minister)}</div>
        <div style={styles.row}>{padLabel('DA FE')} : {daFe}</div>
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
        <strong>{props.cargo || 'PÁRROCO'}</strong>
      </div>

      {/* PIE */}
      <div style={styles.footer}>
        {direccionParroquia} · Tel. {telefonoParroquia}<br />
        {emailParroquia}
      </div>
    </div>
  );
});

MatrimonioPrintTemplate.displayName = 'MatrimonioPrintTemplate';
export default MatrimonioPrintTemplate;