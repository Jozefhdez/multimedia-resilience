export type Song = {
  id: string;
  title: string;
  artist?: string;
  uri: any;
  corrupt?: boolean;
};

export const SONGS: Song[] = [
  {
    id: 's1',
    title: 'Minecraft',
    artist: 'C418',
    uri: require('../../assets/audio/song1.mp3'),
  },
  {
    id: 's2',
    title: 'Mice on venus',
    artist: 'C418',
    uri: require('../../assets/audio/song2.mp3'),
  },
  {
    id: 's3',
    title: 'Haggstrom',
    artist: 'C418',
    uri: require('../../assets/audio/song3.mp3'),
  },
  {
    id: 's4',
    title: 'Moog city',
    artist: 'C418',
    uri: require('../../assets/audio/song4.mp3'),
  },
  {
    id: 's5',
    title: 'Living mice',
    artist: 'C418',
    uri: require('../../assets/audio/song5.mp3'),
  },
  {
    id: 'corrupt',
    title: 'Broken Song',
    artist: 'Unknown Artist',
    uri: require('../../assets/audio/corrupt.mp3'),
    corrupt: true,
  },
];

export default SONGS;
