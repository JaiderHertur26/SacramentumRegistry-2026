
import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MatrimonioPrintTemplate from '@/components/MatrimonioPrintTemplate';
import { motion, AnimatePresence } from 'framer-motion';

const ViewMarriagePartidaModal = ({ isOpen, onClose, partida, auxiliaryData }) => {
    const printComponentRef = useRef();

    if (!isOpen || !partida) return null;

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
                                Partida de Matrimonio
                            </h2>
                            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-200">
                                <X className="w-5 h-5 text-gray-500" />
                            </Button>
                        </div>

                        {/* Content - Scrollable Preview Area */}
                        <div className="flex-1 overflow-auto bg-gray-100 p-8 flex justify-center">
                            <div className="shadow-2xl bg-white print:shadow-none min-h-[11in] w-[8.5in]">
                                <div ref={printComponentRef}>
                                    <MatrimonioPrintTemplate 
                                        data={partida} 
                                        parrocoNombre={auxiliaryData?.parroco || 'PÁRROCO ENCARGADO'} 
                                        cargo={'Párroco'} 
                                        parroquiaInfo={auxiliaryData || {}} 
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

export default ViewMarriagePartidaModal;
