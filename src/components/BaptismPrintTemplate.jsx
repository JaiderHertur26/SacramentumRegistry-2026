
import React, { forwardRef } from 'react';
import { convertDateToSpanishText } from '@/utils/dateTimeFormatters';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { getActivePriest } from '@/utils/getActivePriest';

const BaptismPrintTemplate = forwardRef((props, ref) => {
  const { user } = useAuth();
  const appDataContext = useAppData();
  const { getParrocos } = appDataContext;

  const parrocos = user?.parishId ? getParrocos(user.parishId) : [];
  const activePriestName = getActivePriest(parrocos);

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
    notaMarginal,
    parroquiaInfo = {},
  } = dataSource;

  const finalParrocoName = activePriestName;
  
  const finalParroquiaInfo = {
      ...(props.parroquiaInfo || {}),
      ...parroquiaInfo
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
          if (!d) return '---';
          return convertDateToSpanishText(d);
      } catch (e) {
          return d || '---';
      }
  };

  // CRITICAL FIX: We only want the final, processed marginal note.
  // If we have both, we prioritize notaAlMargen as it usually contains the updated string.
  // We trim to check if it's actually content or just whitespace.
  const finalNote = (notaAlMargen || notaMarginal || "").trim();
  const showNote = !!finalNote && finalNote !== "";

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
        marginBottom: '8px'
    },
    marginalNoteContent: {
        textAlign: 'justify',
        fontSize: '11px',
        fontStyle: 'italic',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.4'
    },
    marginalNoteFooterLine: {
        textAlign: 'center',
        fontSize: '11px',
        fontWeight: 'bold',
        marginTop: '8px'
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

      {/* NOTA MARGINAL - RENDERING FIXED TO SHOW ONLY ONE CLEAN NOTE */}
      {showNote && (
        <div style={styles.marginalNoteContainer}>
            <div style={styles.marginalNoteHeader}>
              - - - - - NOTA AL MARGEN - - - - -
            </div>
            <div className="nota-al-margen" style={styles.marginalNoteContent}>
                {finalNote}
            </div>
            <div style={styles.marginalNoteFooterLine}>
              - - - - - - - - - - - - - - - - - - - - -
            </div>
        </div>
      )}

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
