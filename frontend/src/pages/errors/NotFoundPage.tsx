import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg border border-gov-border shadow-gov-md p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-gov-light text-gov-blue flex items-center justify-center mx-auto border border-gov-border">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gov-navy uppercase tracking-wider">
            HTTP 404 Not Found
          </span>
          <h1 className="text-xl font-bold text-gov-navy mt-2">
            Record or Page Unavailable
          </h1>
          <p className="text-xs text-gov-muted mt-1 leading-relaxed">
            The requested institutional endpoint, master record, or portal page does not exist or has been relocated.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-gov-navy hover:bg-[#0c243f] text-white text-xs font-semibold shadow-sm transition"
          >
            <Home className="w-4 h-4" />
            <span>Return to Portal Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
