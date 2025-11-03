import type { Artist, Song, Genre } from '../types';

export const artists: Artist[] = [
    { id: '1', name: 'Burna Boy', genre: 'Afro-fusion', image: '/Images/Artists/Burna Boy.png' },
    { id: '2', name: 'Wizkid', genre: 'Afrobeats', image: '/Images/Artists/Wizkid.jpeg' },
    { id: '3', name: 'Tems', genre: 'Alt-R&B', image: '/Images/Artists/Tems.webp' },
    { id: '4', name: 'Davido', genre: 'Afrobeats', image: '/Images/Artists/Davido.jpg' },
    { id: '5', name: 'Asake', genre: 'Afrobeats', image: '/Images/Artists/asake.jpeg' },
];

export const songs: Song[] = [
    { id: '1', title: 'WHY LOVE', artist: 'Asake', artistId: '5', image: 'https://i.imgur.com/dummy-whylove.png' },
    { id: '2', title: 'Last Last', artist: 'Burna Boy', artistId: '1', image: 'https://i.imgur.com/dummy-lastlast.png' },
    { id: '3', title: 'Essence', artist: 'Wizkid ft. Tems', artistId: '2', image: 'https://i.imgur.com/dummy-essence.png' },
    { id: '4', title: 'Fall', artist: 'Davido', artistId: '4', image: 'https://i.imgur.com/dummy-fall.png' },
    { id: '5', title: 'Free Mind', artist: 'Tems', artistId: '3', image: 'https://i.imgur.com/dummy-freemind.png' },
];

export const genres: Genre[] = [
    { name: 'Afrobeat', image: 'https://i.imgur.com/uSO21I5.png' },
    { name: 'Highlife', image: 'https://i.imgur.com/3hTzE0s.png' },
    { name: 'Mbalax', image: 'https://i.imgur.com/FmEDpGO.png' },
    { name: 'Benga', image: 'https://i.imgur.com/YwN3f3E.png' },
    { name: 'Kwaito', image: 'https://i.imgur.com/zO4w3bX.png' },
    { name: 'Amapiano', image: 'https://i.imgur.com/dummy-amapiano.png' },
    { name: 'Afro-fusion', image: 'https://i.imgur.com/dummy-afrofusion.png' },
    { name: 'Alt-R&B', image: 'https://i.imgur.com/dummy-altrnb.png' },
];

export const allData = { artists, songs, genres };
