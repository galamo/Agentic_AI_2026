export interface Court {
  id: number;
  name: string;
  fullName: string;
  surface: 'hard' | 'clay' | 'grass';
  colorKey: 'blue' | 'clay' | 'grass' | 'teal';
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface Booking {
  id: string;
  courtId: number;
  date: string;
  startHour: number;
  endHour: number;
  userName: string;
  phone: string;
  confirmedAt: string;
}

export interface BookingResponse {
  success: boolean;
  booking: Booking;
  confirmationCode: string;
}

export interface Issue {
  id: string;
  courtId: number;
  description: string;
  imageBase64?: string | null;
  reporterName: string;
  reportedAt: string;
  status: 'open' | 'in-progress' | 'resolved';
}

export const COURT_COLORS: Record<string, { primary: string; light: string; surface: string }> = {
  blue: { primary: '#1565C0', light: '#E3F2FD', surface: '#1976D2' },
  clay: { primary: '#BF360C', light: '#FBE9E7', surface: '#D84315' },
  grass: { primary: '#1B5E20', light: '#E8F5E9', surface: '#2E7D32' },
  teal: { primary: '#004D40', light: '#E0F2F1', surface: '#00695C' },
};

export const COURT_CHART_COLORS = ['#1565C0', '#BF360C', '#2E7D32', '#00695C'];
