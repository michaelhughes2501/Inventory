import React, { useState } from 'react';
import { getAccessToken } from '../lib/firebase';
import { Mail, HardDrive, FileSpreadsheet, FormInput, MessageSquare, Loader2, Calendar, Video, Presentation, FileText } from 'lucide-react';

export default function WorkspacePanel() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});

  const setStatus = (key: string, msg: string, isLoading: boolean = false) => {
    setMessages(prev => ({ ...prev, [key]: msg }));
    setLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const createSheet = async () => {
    setStatus('sheets', 'Creating spreadsheet...', true);
    try {
      const token = await getAccessToken();
      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: { title: `Inventory Export ${new Date().toLocaleDateString()}` }
        })
      });
      const data = await res.json();
      setStatus('sheets', `Created! ID: ${data.spreadsheetId}`);
    } catch (e: any) {
      setStatus('sheets', `Error: ${e.message}`);
    }
  };

  const createDoc = async () => {
    setStatus('drive', 'Creating document...', true);
    try {
      const token = await getAccessToken();
      const res = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Inventory Report ${new Date().toLocaleDateString()}`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setStatus('drive', `Created document! ID: ${data.documentId}`);
    } catch (e: any) {
      setStatus('drive', `Error: ${e.message}`);
    }
  };

  const sendEmail = async () => {
    setStatus('gmail', 'Sending email...', true);
    try {
      const token = await getAccessToken();
      // Constructing raw email (RFC 2822)
      const rawMessage = [
        'To: michaelhughes2501@gmail.com',
        'Subject: Inventory Alert Test',
        '',
        'This is a test email sent from the Nexus Inventory System.'
      ].join('\n');
      const encodedMessage = btoa(rawMessage).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedMessage })
      });
      const data = await res.json();
      setStatus('gmail', `Sent email! ID: ${data.id}`);
    } catch (e: any) {
      setStatus('gmail', `Error: ${e.message}`);
    }
  };

  const createForm = async () => {
    setStatus('forms', 'Creating form...', true);
    try {
      const token = await getAccessToken();
      const res = await fetch('https://forms.googleapis.com/v1/forms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          info: { title: `Supply Request Form`, documentTitle: `Supply Request` }
        })
      });
      const data = await res.json();
      setStatus('forms', `Created form! ID: ${data.formId}`);
    } catch (e: any) {
      setStatus('forms', `Error: ${e.message}`);
    }
  };

  const listSpaces = async () => {
    setStatus('chat', 'Fetching spaces...', true);
    try {
      const token = await getAccessToken();
      const res = await fetch('https://chat.googleapis.com/v1/spaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setStatus('chat', `Found ${data.spaces?.length || 0} spaces`);
    } catch (e: any) {
      setStatus('chat', `Error: ${e.message}`);
    }
  };

  const createCalendarEvent = async () => {
    setStatus('calendar', 'Creating event...', true);
    try {
      const token = await getAccessToken();
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: 'Inventory Audit Review',
          start: { dateTime: new Date(Date.now() + 86400000).toISOString() },
          end: { dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString() }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setStatus('calendar', `Created event! ID: ${data.id}`);
    } catch (e: any) {
      setStatus('calendar', `Error: ${e.message}`);
    }
  };

  const createMeeting = async () => {
    setStatus('meet', 'Creating meeting space...', true);
    try {
      const token = await getAccessToken();
      const res = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setStatus('meet', `Created meeting! URL: ${data.meetingUri}`);
    } catch (e: any) {
      setStatus('meet', `Error: ${e.message}`);
    }
  };

  const createSlide = async () => {
    setStatus('slides', 'Creating presentation...', true);
    try {
      const token = await getAccessToken();
      const res = await fetch('https://slides.googleapis.com/v1/presentations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Supply Chain Presentation`
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setStatus('slides', `Created slide deck! ID: ${data.presentationId}`);
    } catch (e: any) {
      setStatus('slides', `Error: ${e.message}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/85 p-6 shadow-xs mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">Google Workspace Integrations</h3>
          <p className="text-xs text-slate-500">Connect your inventory with Google services</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sheets */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="text-green-600 h-5 w-5" />
            <span className="font-semibold text-sm">Google Sheets</span>
          </div>
          <button onClick={createSheet} disabled={loading['sheets']} className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
            {loading['sheets'] && <Loader2 className="h-3 w-3 animate-spin" />} Create Export Sheet
          </button>
          {messages['sheets'] && <p className="text-[10px] text-slate-500 mt-2 truncate">{messages['sheets']}</p>}
        </div>

        {/* Docs */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="text-blue-500 h-5 w-5" />
            <span className="font-semibold text-sm">Google Docs</span>
          </div>
          <button onClick={createDoc} disabled={loading['drive']} className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
            {loading['drive'] && <Loader2 className="h-3 w-3 animate-spin" />} Create Report Doc
          </button>
          {messages['drive'] && <p className="text-[10px] text-slate-500 mt-2 truncate">{messages['drive']}</p>}
        </div>

        {/* Gmail */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="text-red-500 h-5 w-5" />
            <span className="font-semibold text-sm">Gmail</span>
          </div>
          <button onClick={sendEmail} disabled={loading['gmail']} className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
            {loading['gmail'] && <Loader2 className="h-3 w-3 animate-spin" />} Send Alert Email
          </button>
          {messages['gmail'] && <p className="text-[10px] text-slate-500 mt-2 truncate">{messages['gmail']}</p>}
        </div>

        {/* Forms */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <FormInput className="text-purple-600 h-5 w-5" />
            <span className="font-semibold text-sm">Google Forms</span>
          </div>
          <button onClick={createForm} disabled={loading['forms']} className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
            {loading['forms'] && <Loader2 className="h-3 w-3 animate-spin" />} Create Request Form
          </button>
          {messages['forms'] && <p className="text-[10px] text-slate-500 mt-2 truncate">{messages['forms']}</p>}
        </div>

        {/* Chat */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="text-teal-600 h-5 w-5" />
            <span className="font-semibold text-sm">Google Chat</span>
          </div>
          <button onClick={listSpaces} disabled={loading['chat']} className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
            {loading['chat'] && <Loader2 className="h-3 w-3 animate-spin" />} List Chat Spaces
          </button>
          {messages['chat'] && <p className="text-[10px] text-slate-500 mt-2 truncate">{messages['chat']}</p>}
        </div>
        {/* Calendar */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-blue-600 h-5 w-5" />
            <span className="font-semibold text-sm">Google Calendar</span>
          </div>
          <button onClick={createCalendarEvent} disabled={loading['calendar']} className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
            {loading['calendar'] && <Loader2 className="h-3 w-3 animate-spin" />} Create Audit Event
          </button>
          {messages['calendar'] && <p className="text-[10px] text-slate-500 mt-2 truncate">{messages['calendar']}</p>}
        </div>

        {/* Meet */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Video className="text-green-500 h-5 w-5" />
            <span className="font-semibold text-sm">Google Meet</span>
          </div>
          <button onClick={createMeeting} disabled={loading['meet']} className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
            {loading['meet'] && <Loader2 className="h-3 w-3 animate-spin" />} Create Meeting Space
          </button>
          {messages['meet'] && <p className="text-[10px] text-slate-500 mt-2 truncate">{messages['meet']}</p>}
        </div>

        {/* Slides */}
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Presentation className="text-yellow-500 h-5 w-5" />
            <span className="font-semibold text-sm">Google Slides</span>
          </div>
          <button onClick={createSlide} disabled={loading['slides']} className="w-full mb-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
            {loading['slides'] && <Loader2 className="h-3 w-3 animate-spin" />} Create Presentation
          </button>
          {messages['slides'] && <p className="text-[10px] text-slate-500 mt-2 truncate">{messages['slides']}</p>}
        </div>
      </div>
    </div>
  );
}
