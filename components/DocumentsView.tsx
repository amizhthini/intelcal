import React from 'react';
import { ExtractedData } from '../types';
import InputArea from './InputArea';
import ResultsDisplay from './ResultsDisplay';

interface DocumentsViewProps {
  onExtract: (file: File | null, text: string) => void;
  isLoading: boolean;
  extractedData: ExtractedData | null;
  onAddToCalendar: (data: ExtractedData) => void;
  onExportToICS: (data: ExtractedData) => void;
  isGoogleCalendarConnected: boolean;
  onAddToGoogleCalendar: (data: ExtractedData) => void;
}

const DocumentsView: React.FC<DocumentsViewProps> = (props) => {
  return (
    <>
      <InputArea onExtract={props.onExtract} isLoading={props.isLoading} />
      <ResultsDisplay
        data={props.extractedData}
        isLoading={props.isLoading}
        onAddToCalendar={props.onAddToCalendar}
        onExportToICS={props.onExportToICS}
        isGoogleCalendarConnected={props.isGoogleCalendarConnected}
        onAddToGoogleCalendar={props.onAddToGoogleCalendar}
      />
    </>
  );
};

export default DocumentsView;