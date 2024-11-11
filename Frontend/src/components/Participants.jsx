import React from 'react';
import { FaUserCircle } from 'react-icons/fa';
import { jsPDF } from 'jspdf';
import { FaUsers, FaComments, FaVideo, FaVideoSlash } from 'react-icons/fa';
import { CgTranscript } from "react-icons/cg";

const Participants = ({ transcript, userName }) => {
  // Function to split long text into paragraphs based on max line length
  const splitTextIntoParagraphs = (text, maxLineLength) => {
    if (!text) return [];
    const words = text.split(' ');
    const paragraphs = [];
    let currentParagraph = '';

    words.forEach((word) => {
      if (currentParagraph.length + word.length + 1 <= maxLineLength) {
        currentParagraph += (currentParagraph ? ' ' : '') + word;
      } else {
        paragraphs.push(currentParagraph);
        currentParagraph = word;
      }
    });

    if (currentParagraph) {
      paragraphs.push(currentParagraph);
    }

    return paragraphs;
  };

  // Function to handle PDF download with wrapped text
  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const maxLineWidth = pageWidth - 2 * margin;
    let yPosition = 20;
    const currentDate = new Date().toLocaleString();

    // Header
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text("Participants Transcript", margin, 10);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Downloaded on: ${currentDate}`, margin, 16);

    // Divider
    doc.setDrawColor(200);
    doc.line(margin, 18, pageWidth - margin, 18);

    // Content
    doc.setFontSize(10);
    doc.setTextColor(0);

    const sampleParticipants = transcript
      ? transcript.split('\n').filter((line) => line.trim() !== "")
      : [];

    if (sampleParticipants.length > 0) {
      sampleParticipants.forEach((participant, index) => {
        const [name, message] = participant.split(':');
        const participantName = `${index + 1}. ${name.trim()}`;
        const participantMessage = message?.trim() || 'Speaking...';

        // Split the name and message into paragraphs for wrapping
        const nameParagraphs = splitTextIntoParagraphs(participantName, maxLineWidth);
        const messageParagraphs = splitTextIntoParagraphs(participantMessage, maxLineWidth);

        // Bold for names
        doc.setFont("helvetica", "bold");
        nameParagraphs.forEach((line) => {
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });

        // Regular font for messages
        doc.setFont("helvetica", "normal");
        messageParagraphs.forEach((line) => {
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });

        // Page overflow check
        if (yPosition > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          yPosition = 20;
        }
      });
    } else {
      doc.text("No active participants or conversations...", margin, yPosition);
    }

    // Footer with page number
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, doc.internal.pageSize.getHeight() - 10);
    }

    // Save the PDF
    doc.save(`Participants_Transcript_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const sampleParticipants = transcript
    ? transcript.split('\n').filter((line) => line.trim() !== "")
    : [];

  return (
    <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-gray-700 rounded-t-lg">
      <div className='flex gap-2'>
        {/* Script */}
      <button
        className="flex items-center p-2  rounded-full bg-gray-300 text-gray-800 hover:bg-blue-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transform transition-all duration-200 ease-out"
        aria-label="View Participants"
      >
        <CgTranscript className="mr-2 " />
        <span className="hidden md:inline text-xs  font-semibold hover:">  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div></span>
      </button>
  {/* Participants Button */}
      <button
        className="flex items-center p-2  rounded-full bg-blue-50 text-gray-800 hover:bg-blue-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transform transition-all duration-200 ease-out"
        aria-label="View Participants"
      >
        <FaUsers className="mr-2 " />
        <span className="hidden md:inline text-xs  font-semibold hover:"> </span>
      </button>

     
</div>
        <button
          onClick={downloadPDF}
          className="text-xs text-white bg-blue-600 px-3 py-1 rounded-lg hover:bg-blue-500 transition-colors"
        >
          Download PDF
        </button>
      </div>

      {/* Participants List */}
      <div className="p-3 h-full w-full overflow-y-auto custom-scrollbar space-y-3">
        {sampleParticipants.length > 0 ? (
          sampleParticipants.map((participant, index) => {
            const [name, message] = participant.split(':');
            return (
              <div
                key={index}
                className="flex flex-col p-3 bg-gray-800 rounded-lg w-full shadow-md"
              >
                {/* User Info */}
                <div className="flex items-start gap-2">
                  <FaUserCircle className="text-gray-400 w-6 h-6" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-200 font-semibold truncate">
                      {`${index + 1}. ${name?.trim() || "Unknown"}`}
                    </p>
                    <p className="text-xs text-gray-400 break-words max-w-full overflow-hidden">
                      {message?.trim() || "Speaking..."}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No active participants or conversations...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Participants;
