import type { Artist, Song, Genre } from '../types';

export const artists: Artist[] = [
    { id: '1', name: 'Burna Boy', genre: 'Afro-fusion', image: 'https://i.scdn.co/image/ab6761610000e5eb77f079575b5250e12237ba78' },
    { id: '2', name: 'Wizkid', genre: 'Afrobeats', image: 'https://i.scdn.co/image/ab6761610000e5eb437b9e2a82505b3d93ff1022' },
    { id: '3', name: 'Tems', genre: 'Alt-R&B', image: 'https://i.scdn.co/image/ab6761610000e5eb0aa3e7c8e0c3f1a04863438f' },
    { id: '4', name: 'Davido', genre: 'Afrobeats', image: 'https://i.scdn.co/image/ab6761610000e5eb1c07c576a9f4c5b6a7b3f4c2' },
    { id: '5', name: 'Asake', genre: 'Afrobeats', image: 'https://i.scdn.co/image/ab6761610000e5eb2e1e4b7a3d5a0c7c5b3b3b3b' },
];

export const songs: Song[] = [
    { id: '1', title: 'WHY LOVE', artist: 'Asake', artistId: '5', image: '' },
    { id: '2', title: 'Last Last', artist: 'Burna Boy', artistId: '1', image: '' },
    { id: '3', title: 'Essence', artist: 'Wizkid ft. Tems', artistId: '2', image: '' },
    { id: '4', title: 'Fall', artist: 'Davido', artistId: '4', image: '' },
    { id: '5', title: 'Free Mind', artist: 'Tems', artistId: '3', image: '' },
];

export const genres: Genre[] = [
    { name: 'Afrobeat', image: '' },
    { name: 'Highlife', image: '' },
    { name: 'Mbalax', image: '' },
    { name: 'Benga', image: '' },
    { name: 'Kwaito', image: '' },
    { name: 'Amapiano', image: '' },
    { name: 'Afro-fusion', image: '' },
    { name: 'Alt-R&B', image: '' },
];

export const allData = { artists, songs, genres };
