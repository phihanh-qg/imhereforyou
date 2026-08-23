import React, { useState, useEffect } from "react";
import {
  fetchGoogleContacts,
  searchGoogleContacts,
  GoogleContact,
} from "../../services/googleWorkspaceService";
import {
  Search,
  UserPlus,
  Users,
  Check,
  X,
  Phone,
  Mail,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface GoogleContactsPickerModalProps {
  onSelectContact: (contact: {
    displayName: string;
    email: string;
    phoneNumber?: string;
    photoURL?: string;
    relationship?: string;
  }) => void;
  onClose: () => void;
}

export const GoogleContactsPickerModal: React.FC<GoogleContactsPickerModalProps> = ({
  onSelectContact,
  onClose,
}) => {
  const [contacts, setContacts] = useState<GoogleContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<GoogleContact | null>(null);
  const [relationship, setRelationship] = useState<string>("Bố/Mẹ");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load initial contacts
  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const list = await fetchGoogleContacts(50);
        setContacts(list);
      } catch (err: any) {
        console.error("Failed to load contacts:", err);
        setErrorMsg(
          err?.message ||
            "Không thể truy cập Google Contacts. Vui lòng cấp quyền truy cập danh bạ Google."
        );
      } finally {
        setLoading(false);
      }
    };

    loadInitial();
  }, []);

  // Handle live search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchGoogleContacts(searchQuery);
        setContacts(results);
      } catch (err) {
        console.warn("Search contacts error:", err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleConfirmAdd = () => {
    if (!selectedContact) return;
    onSelectContact({
      displayName: selectedContact.displayName,
      email: selectedContact.email || "",
      phoneNumber: selectedContact.phoneNumber || "",
      photoURL: selectedContact.photoUrl || "",
      relationship: relationship,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl p-4 sm:p-5 shadow-xl text-left space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Chọn người thân từ Google Contacts
              </h3>
              <span className="text-xs text-slate-500">
                Thiết lập vòng kết nối tin cậy (Trusted Circle)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, số điện thoại hoặc email..."
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
          {searching && (
            <Loader2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" />
          )}
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs shrink-0">
            {errorMsg}
          </div>
        )}

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[340px] space-y-1.5 pr-1">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Đang tải danh bạ Google...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <Users className="w-8 h-8 text-slate-300 mb-1" />
              <span className="text-xs font-semibold text-slate-700">
                Không tìm thấy liên hệ nào
              </span>
              <span className="text-[11px] text-slate-400">
                Thử nhập tên khác hoặc kiểm tra danh bạ trên Google Contacts.
              </span>
            </div>
          ) : (
            contacts.map((c) => {
              const isSelected = selectedContact?.resourceName === c.resourceName;
              return (
                <div
                  key={c.resourceName}
                  onClick={() => setSelectedContact(c)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-500"
                      : "border-slate-200 hover:bg-slate-50 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {c.photoUrl ? (
                      <img
                        src={c.photoUrl}
                        alt={c.displayName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-xs shrink-0">
                        {c.displayName ? c.displayName.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="truncate">
                      <span className="font-bold text-slate-900 text-xs block truncate">
                        {c.displayName}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        {c.phoneNumber && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {c.phoneNumber}
                          </span>
                        )}
                        {c.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-2.5 h-2.5 text-slate-400" />
                            <span className="truncate">{c.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Contact configuration */}
        {selectedContact && (
          <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-950">
                Thiết lập vai trò cho: <span className="underline">{selectedContact.displayName}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold text-slate-600 shrink-0">
                Vai trò trong gia đình:
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-md border border-indigo-300 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium"
              >
                <option value="Bố">Bố</option>
                <option value="Mẹ">Mẹ</option>
                <option value="Bà nội / Bà ngoại">Bà nội / Bà ngoại</option>
                <option value="Ông nội / Ông ngoại">Ông nội / Ông ngoại</option>
                <option value="Anh trai / Chị gái">Anh trai / Chị gái</option>
                <option value="Bác sĩ gia đình">Bác sĩ gia đình</option>
                <option value="Người chăm sóc tin cậy">Người chăm sóc tin cậy</option>
              </select>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!selectedContact}
            onClick={handleConfirmAdd}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm vào Trusted Circle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
