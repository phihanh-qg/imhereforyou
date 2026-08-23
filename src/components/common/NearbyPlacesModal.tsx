import React, { useState, useEffect } from "react";
import {
  searchNearbyMedicalPlaces,
  NearbyPlace,
  getGoogleMapsDirectionsUrl,
} from "../../services/googleMapsService";
import {
  MapPin,
  Building2,
  Phone,
  Navigation,
  ExternalLink,
  X,
  Loader2,
  Compass,
  Pill,
  Stethoscope,
  Cross,
} from "lucide-react";

interface NearbyPlacesModalProps {
  userLocation?: { lat: number; lng: number } | null;
  parentName?: string;
  onClose: () => void;
}

export const NearbyPlacesModal: React.FC<NearbyPlacesModalProps> = ({
  userLocation,
  parentName = "Bố/Mẹ",
  onClose,
}) => {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [category, setCategory] = useState<"all" | "hospital" | "pharmacy" | "clinic">("all");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: userLocation?.lat || 10.7769, // Default Ho Chi Minh City
    lng: userLocation?.lng || 106.7009,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [locating, setLocating] = useState<boolean>(false);

  // Get user's device location on open
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lng) {
      setCurrentCoords(userLocation);
      loadPlaces(userLocation.lat, userLocation.lng, category);
      return;
    }

    if ("geolocation" in navigator) {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentCoords(coords);
          setLocating(false);
          loadPlaces(coords.lat, coords.lng, category);
        },
        (err) => {
          console.warn("Could not get device GPS, using default city center:", err);
          setLocating(false);
          loadPlaces(currentCoords.lat, currentCoords.lng, category);
        },
        { timeout: 5000 }
      );
    } else {
      loadPlaces(currentCoords.lat, currentCoords.lng, category);
    }
  }, [userLocation]);

  const loadPlaces = async (
    lat: number,
    lng: number,
    cat: "all" | "hospital" | "pharmacy" | "clinic"
  ) => {
    setLoading(true);
    try {
      const data = await searchNearbyMedicalPlaces(lat, lng, cat);
      setPlaces(data);
    } catch (err) {
      console.error("Error loading places:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat: "all" | "hospital" | "pharmacy" | "clinic") => {
    setCategory(cat);
    loadPlaces(currentCoords.lat, currentCoords.lng, cat);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl text-left space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-[#C40C3B] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Cơ sở y tế gần bạn
              </h3>
              <p className="text-xs text-slate-500">
                Tìm bệnh viện, nhà thuốc và phòng khám xung quanh {parentName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Categories Tab with Clean Vector Icons */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 shrink-0 overflow-x-auto">
          <button
            onClick={() => handleCategoryChange("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              category === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => handleCategoryChange("hospital")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              category === "hospital"
                ? "bg-[#C40C3B] text-white shadow-2xs"
                : "bg-rose-50/80 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bệnh viện</span>
          </button>
          <button
            onClick={() => handleCategoryChange("pharmacy")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              category === "pharmacy"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Nhà thuốc</span>
          </button>
          <button
            onClick={() => handleCategoryChange("clinic")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              category === "clinic"
                ? "bg-sky-600 text-white shadow-2xs"
                : "bg-sky-50 text-sky-700 hover:bg-sky-100"
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Phòng khám</span>
          </button>
        </div>

        {/* Places List */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[360px] space-y-2.5 pr-1">
          {loading || locating ? (
            <div className="h-48 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#C40C3B]" />
              <span className="text-xs">
                {locating ? "Đang xác định vị trí vệ tinh..." : "Đang tìm cơ sở y tế gần nhất..."}
              </span>
            </div>
          ) : places.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <Building2 className="w-8 h-8 text-slate-300 mb-1" />
              <span className="text-xs font-semibold text-slate-700">
                Không tìm thấy địa điểm phù hợp
              </span>
            </div>
          ) : (
            places.map((place) => {
              const directionsUrl = getGoogleMapsDirectionsUrl(
                currentCoords.lat,
                currentCoords.lng,
                place.location.lat,
                place.location.lng
              );

              return (
                <div
                  key={place.id}
                  className="p-3 rounded-2xl border border-slate-100 bg-[#FAFCFB] hover:bg-white hover:border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                          place.type === "hospital"
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : place.type === "pharmacy"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-sky-50 text-sky-700 border border-sky-100"
                        }`}
                      >
                        {place.type === "hospital" ? (
                          <Building2 className="w-2.5 h-2.5" />
                        ) : place.type === "pharmacy" ? (
                          <Pill className="w-2.5 h-2.5" />
                        ) : (
                          <Stethoscope className="w-2.5 h-2.5" />
                        )}
                        <span>{place.typeLabel}</span>
                      </span>
                      {place.distanceKm !== undefined && (
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-0.5">
                          <Compass className="w-3 h-3 text-slate-400" />
                          ~{place.distanceKm} km
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {place.name}
                    </h4>

                    <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{place.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                    {place.phone && (
                      <a
                        href={`tel:${place.phone}`}
                        className="py-1.5 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>Gọi</span>
                      </a>
                    )}

                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Chỉ đường</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>Vị trí: {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
