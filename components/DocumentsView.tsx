
import React from 'react';
import { ExtractedData, Category } from '../types';
import InputArea from './InputArea';
import ResultsDisplay from './ResultsDisplay';

interface DocumentsViewProps {
  onExtract: (files: File[], text: string) => void;
  isLoading: boolean;
  extractionResults: ExtractedData[];
  onAddToCalendar: (data: ExtractedData) => void;
  onBulkAddToCalendar: (data: ExtractedData[]) => void;
  onBulkExportToICS: (data: ExtractedData[]) => void;
  isGoogleCalendarConnected: boolean;
  onAddToGoogleCalendar: (data: ExtractedData) => void;
  onBulkAddToGoogleCalendar: (data: ExtractedData[]) => void;
  allCategories: Category[];
  setAllCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const DocumentsView: React.FC<DocumentsViewProps> = (props) => {
  return (
    <>
      <InputArea onExtract={props.onExtract} isLoading={props.isLoading} />
      <ResultsDisplay
        results={props.extractionResults}
        isLoading={props.isLoading}
        onAddToCalendar={props.onAddToCalendar}
        onBulkAddToCalendar={props.onBulkAddToCalendar}
        onBulkExportToICS={props.onBulkExportToICS}
        isGoogleCalendarConnected={props.isGoogleCalendarConnected}
        onAddToGoogleCalendar={props.onAddToGoogleCalendar}
        onBulkAddToGoogleCalendar={props.onBulkAddToGoogleCalendar}
        allCategories={props.allCategories}
        setAllCategories={props.setAllCategories}
      />
    </>
  );
};

export default DocumentsView;
