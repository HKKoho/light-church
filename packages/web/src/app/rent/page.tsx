import { permanentRedirect } from 'next/navigation';

/** The rent form now lives on the church site. */
export default function RentRedirect() {
  permanentRedirect('/churchweb/rent');
}
