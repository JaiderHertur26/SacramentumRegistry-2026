import React, { useRef } from 'react';
import { X, Printer, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BaptismPrintTemplate from '@/components/BaptismPrintTemplate';
import { motion, AnimatePresence } from 'framer-motion';

const ViewBaptismPartidaModal = ({ isOpen, onClose, partida, auxiliaryData }) => {
    const printComponentRef = useRef();

    if (!isOpen || !partida) return null;

    const hasMarginNote = !!partida.marginNote || !!partida.notaMarginal;

    const handlePrint = () => {
        const printContent = printComponentRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '', 'height=600,width=800');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Imprimir Partida</title>');
        // Copy styles
        const styles = document.querySelectorAll('link[rel="stylesheet"], style');
        styles.forEach(node => {
            printWindow.document.head.appendChild(node.cloneNode(true));
        });
        printWindow.document.write('</head><body class="bg-white">');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg shrink-0">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 p-1.5 rounded-md text-xs">VISTA PREVIA</span>
                                Partida de Bautismo
                                {(partida.type === 'replacement' || partida.createdByDecree === 'replacement') && (
                                     <span className="bg-yellow-200 text-yellow-800 p-1.5 rounded-md text-xs ml-2 border border-yellow-300 shadow-sm">POR DECRETO (REPOSICIÓN)</span>
                                )}
                            </h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-200">
                                <X className="w-5 h-5 text-gray-500" />
                            </Button>
                        </div>

                        {/* Content - Scrollable Preview Area */}
                        <div className="flex-1 overflow-auto bg-gray-100 p-8 flex flex-col items-center gap-6">
                            
                            {/* Visual Display for Metadata outside of Print Template */}
                            {hasMarginNote && (
                                <div className="w-[8.5in] border-l-4 border-yellow-500 bg-yellow-50 p-4 rounded-r-lg shadow-sm print:hidden mb-2 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 -mr-6 -mt-6 text-yellow-200 opacity-20 pointer-events-none">
                                         <BookOpen className="w-32 h-32" />
                                     </div>
                                     <h4 className="text-sm font-bold text-yellow-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                         <BookOpen className="w-4 h-4" /> Nota Marginal Activa
                                     </h4>
                                     
                                     {partida.marginNote ? (
                                         <div className="relative z-10 font-mono text-sm leading-relaxed whitespace-pre-wrap text-yellow-900">
                                             <p className="mb-2">{partida.marginNote.text}</p>
                                             <div className="flex gap-4 mt-3 pt-2 border-t border-yellow-300 text-xs">
                                                 <span className="bg-white/50 px-2 py-1 rounded border border-yellow-200">
                                                    <strong>Aplicado el:</strong> {partida.marginNote.appliedDate || '-'}
                                                 </span>
                                                 <span className="bg-white/50 px-2 py-1 rounded border border-yellow-200">
                                                    <strong>Decreto No:</strong> {partida.marginNote.appliedByDecree || '-'}
                                                 </span>
                                                 {partida.marginNote.type && (
                                                     <span className="bg-white/50 px-2 py-1 rounded border border-yellow-200 capitalize">
                                                        <strong>Tipo:</strong> {partida.marginNote.type}
                                                     </span>
                                                 )}
                                             </div>
                                         </div>
                                     ) : (
                                         <div className="relative z-10 font-mono text-sm leading-relaxed whitespace-pre-wrap text-yellow-900">
                                             {partida.notaMarginal}
                                         </div>
                                     )}
                                </div>
                            )}

                            <div className="shadow-2xl bg-white print:shadow-none min-h-[11in] w-[8.5in]">
                                <div ref={printComponentRef}>
                                    <BaptismPrintTemplate 
                                        data={partida} 
                                        parrocoNombre={auxiliaryData?.parroco || 'PÁRROCO ENCARGADO'} 
                                        cargo={'Párroco'} 
                                        parroquiaInfo={auxiliaryData} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer - Actions */}
                        <div className="p-4 border-t border-gray-100 bg-white rounded-b-lg flex justify-end gap-3 shrink-0">
                            <Button variant="outline" onClick={onClose} className="border-gray-300">
                                Cerrar
                            </Button>
                            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2">
                                <Printer className="w-4 h-4" />
                                Imprimir Partida
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ViewBaptismPartidaModal;