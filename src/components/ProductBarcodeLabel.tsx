import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface ProductBarcodeLabelProps {
  barcode: string;
  format?: 'CODE128' | 'EAN13' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  lineColor?: string;
  background?: string;
  className?: string;
}

export const ProductBarcodeLabel: React.FC<ProductBarcodeLabelProps> = ({
  barcode,
  format = 'CODE128',
  width = 1.6,
  height = 42,
  displayValue = true,
  fontSize = 11,
  lineColor = '#000000',
  background = 'transparent',
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !barcode) return;

    try {
      JsBarcode(svgRef.current, barcode, {
        format: format,
        width: width,
        height: height,
        displayValue: displayValue,
        fontSize: fontSize,
        margin: 4,
        lineColor: lineColor,
        background: background,
        font: 'monospace',
      });
    } catch (e) {
      // Fallback to generic CODE128 if format validation fails
      try {
        JsBarcode(svgRef.current, barcode, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: 4,
          lineColor: lineColor,
          background: background,
          font: 'monospace',
        });
      } catch (inner) {
        console.warn('Barcode render error for code:', barcode, inner);
      }
    }
  }, [barcode, format, width, height, displayValue, fontSize, lineColor, background]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
};
