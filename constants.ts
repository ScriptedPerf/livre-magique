
import { LearningItem } from './types';

// Using very specific, high-reliability Unsplash IDs
export const ALPHABET_ITEMS: LearningItem[] = [
    { id: 'A', label: 'A', word: 'Amis', englishWord: 'Friends', image: 'https://images.unsplash.com/photo-1540479859555-17af45c78602?auto=format&fit=crop&q=80&w=400', color: 'bg-yellow-400', secondaryColor: 'text-yellow-700', category: 'alphabet' },
    { id: 'B', label: 'B', word: 'Bébé', englishWord: 'Baby', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Baby.jpg', color: 'bg-blue-400', secondaryColor: 'text-blue-700', category: 'alphabet' },
    { id: 'C', label: 'C', word: 'Coccinelle', englishWord: 'Ladybug', image: 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?auto=format&fit=crop&q=80&w=400', color: 'bg-red-500', secondaryColor: 'text-red-800', category: 'alphabet' },
    { id: 'D', label: 'D', word: 'Dinosaure', englishWord: 'Dinosaur', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Stegosaurus.jpg', color: 'bg-green-500', secondaryColor: 'text-green-800', category: 'alphabet' },
    { id: 'E', label: 'E', word: 'Escargot', englishWord: 'Snail', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Common_snail.jpg', color: 'bg-amber-300', secondaryColor: 'text-amber-800', category: 'alphabet' },
    { id: 'É', label: 'É', word: 'Éléphant', englishWord: 'Elephant', image: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&q=80&w=400', color: 'bg-slate-400', secondaryColor: 'text-slate-700', category: 'alphabet' },
    { id: 'F', label: 'F', word: 'Fille', englishWord: 'Girl', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Girl_smiling.jpg', color: 'bg-pink-400', secondaryColor: 'text-pink-700', category: 'alphabet' },
    { id: 'G', label: 'G', word: 'Girafe', englishWord: 'Giraffe', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Giraffe.JPG', color: 'bg-orange-300', secondaryColor: 'text-orange-600', category: 'alphabet' },
    { id: 'H', label: 'H', word: 'Hibou', englishWord: 'Owl', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Owl.jpg', color: 'bg-amber-600', secondaryColor: 'text-amber-900', category: 'alphabet' },
    { id: 'I', label: 'I', word: 'Igloo', englishWord: 'Igloo', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Igloo.jpg', color: 'bg-cyan-200', secondaryColor: 'text-cyan-700', category: 'alphabet' },
    { id: 'J', label: 'J', word: 'Jus', englishWord: 'Juice', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Orange_juice_1.jpg', color: 'bg-yellow-600', secondaryColor: 'text-yellow-900', category: 'alphabet' },
    { id: 'K', label: 'K', word: 'Koala', englishWord: 'Koala', image: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&q=80&w=400', color: 'bg-stone-300', secondaryColor: 'text-stone-600', category: 'alphabet' },
    { id: 'L', label: 'L', word: 'Lion', englishWord: 'Lion', image: 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?auto=format&fit=crop&q=80&w=400', color: 'bg-yellow-700', secondaryColor: 'text-yellow-950', category: 'alphabet' },
    { id: 'M', label: 'M', word: 'Maman', englishWord: 'Mom', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mary_Cassatt_-_Mother_and_Child_(The_Goodnight_Hug).jpg', color: 'bg-rose-300', secondaryColor: 'text-rose-700', category: 'alphabet' },
    { id: 'N', label: 'N', word: 'Narval', englishWord: 'Narwhal', image: 'https://images.unsplash.com/photo-1560275619-4662e36fa65c?auto=format&fit=crop&q=80&w=400', color: 'bg-blue-300', secondaryColor: 'text-blue-800', category: 'alphabet' },
    { id: 'O', label: 'O', word: 'Orange', englishWord: 'Orange', image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=400', color: 'bg-orange-500', secondaryColor: 'text-orange-900', category: 'alphabet' },
    { id: 'P', label: 'P', word: 'Pomme', englishWord: 'Apple', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=400', color: 'bg-red-600', secondaryColor: 'text-red-100', category: 'alphabet' },
    { id: 'Q', label: 'Q', word: 'Question', englishWord: 'Question', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Question_mark.png', color: 'bg-yellow-200', secondaryColor: 'text-yellow-800', category: 'alphabet' },
    { id: 'R', label: 'R', word: 'Robot', englishWord: 'Robot', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Humanoid_Robot.webp', color: 'bg-gray-400', secondaryColor: 'text-gray-800', category: 'alphabet' },
    { id: 'S', label: 'S', word: 'Serpent', englishWord: 'Snake', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Green_snake.jpg', color: 'bg-green-800', secondaryColor: 'text-green-100', category: 'alphabet' },
    { id: 'T', label: 'T', word: 'Tortue', englishWord: 'Turtle', image: 'https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?auto=format&fit=crop&q=80&w=400', color: 'bg-green-700', secondaryColor: 'text-green-200', category: 'alphabet' },
    { id: 'U', label: 'U', word: 'Ukulélé', englishWord: 'Ukulele', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ukulele.jpg', color: 'bg-orange-200', secondaryColor: 'text-orange-700', category: 'alphabet' },
    { id: 'V', label: 'V', word: 'Voiture', englishWord: 'Car', image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&q=80&w=400', color: 'bg-red-500', secondaryColor: 'text-red-900', category: 'alphabet' },
    { id: 'W', label: 'W', word: 'Wagon', englishWord: 'Wagon', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Little_kids_playing_with_a_red_wagon.jpg', color: 'bg-red-600', secondaryColor: 'text-red-200', category: 'alphabet' },
    { id: 'X', label: 'X', word: 'Xylophone', englishWord: 'Xylophone', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Xylophone.jpg', color: 'bg-pink-300', secondaryColor: 'text-pink-600', category: 'alphabet' },
    { id: 'Y', label: 'Y', word: 'Yoyo', englishWord: 'Yo-yo', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Wooden_yo-yo.jpg', color: 'bg-purple-500', secondaryColor: 'text-purple-100', category: 'alphabet' },
    { id: 'Z', label: 'Z', word: 'Zèbre', englishWord: 'Zebra', image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Zebra_Botswana_edit02.jpg', color: 'bg-black', secondaryColor: 'text-white', category: 'alphabet' },
];
export const SHAPE_ITEMS: LearningItem[] = [
    { id: 'cercle', label: '●', word: 'Cercle', image: 'https://images.unsplash.com/photo-1518399581643-41a4a159954b?auto=format&fit=crop&q=80&w=400', color: 'bg-purple-600', secondaryColor: 'text-purple-800', category: 'shapes' },
    { id: 'carre', label: '■', word: 'Carré', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400', color: 'bg-blue-600', secondaryColor: 'text-blue-800', category: 'shapes' },
    { id: 'triangle', label: '▲', word: 'Triangle', image: 'https://images.unsplash.com/photo-1490122281814-1357ee08d172?auto=format&fit=crop&q=80&w=400', color: 'bg-red-500', secondaryColor: 'text-red-700', category: 'shapes' },
    { id: 'etoile', label: '★', word: 'Étoile', image: 'https://images.unsplash.com/photo-1590212151175-e58edd96d8f4?auto=format&fit=crop&q=80&w=400', color: 'bg-green-500', secondaryColor: 'text-green-700', category: 'shapes' },
    { id: 'coeur', label: '♥', word: 'Cœur', image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=400', color: 'bg-red-600', secondaryColor: 'text-red-800', category: 'shapes' },
    { id: 'rectangle', label: '█', word: 'Rectangle', image: 'https://images.unsplash.com/photo-1549413240-42f89f285223?auto=format&fit=crop&q=80&w=400', color: 'bg-yellow-400', secondaryColor: 'text-yellow-700', category: 'shapes' },
    { id: 'losange', label: '◆', word: 'Losange', image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400', color: 'bg-orange-500', secondaryColor: 'text-orange-700', category: 'shapes' },
    { id: 'ovale', label: '⬭', word: 'Ovale', image: 'https://images.unsplash.com/photo-1525268771113-32d9e9021a97?auto=format&fit=crop&q=80&w=400', color: 'bg-pink-500', secondaryColor: 'text-pink-700', category: 'shapes' },
    { id: 'lune', label: '🌙', word: 'Lune', image: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&q=80&w=400', color: 'bg-cyan-400', secondaryColor: 'text-cyan-700', category: 'shapes' },
    { id: 'trapeze', label: '⏢', word: 'Trapèze', image: 'https://images.unsplash.com/photo-1502429892517-f9baf948453e?auto=format&fit=crop&q=80&w=400', color: 'bg-amber-500', secondaryColor: 'text-amber-700', category: 'shapes' },
];

const getFrenchNumberWord = (n: number): string => {
    const units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf'];
    const teens = ['Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf'];
    const tens = ['', '', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-dix', 'Quatre-vingts', 'Quatre-vingt-dix'];

    if (n === 100) return 'Cent';
    if (n < 10) return units[n];
    if (n >= 10 && n < 20) return teens[n - 10];

    const tenDigit = Math.floor(n / 10);
    const unitDigit = n % 10;

    if (tenDigit === 7) return unitDigit === 1 ? 'Soixante et onze' : `Soixante-${teens[unitDigit].toLowerCase()}`;
    if (tenDigit === 8) return unitDigit === 0 ? 'Quatre-vingts' : `Quatre-vingt-${units[unitDigit].toLowerCase()}`;
    if (tenDigit === 9) return unitDigit === 1 ? 'Quatre-vingt-onze' : `Quatre-vingt-${teens[unitDigit].toLowerCase()}`;

    if (unitDigit === 0) return tens[tenDigit];
    if (unitDigit === 1) return `${tens[tenDigit]} et un`;
    return `${tens[tenDigit]}-${units[unitDigit].toLowerCase()}`;
};

// High-quality counting toy image
const NUMBER_IMAGE_URL = 'https://images.unsplash.com/photo-1634152962476-4b8a00e1915c?auto=format&fit=crop&q=80&w=400';

export const NUMBER_ITEMS: LearningItem[] = Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    const colors = ['bg-blue-400', 'bg-purple-400', 'bg-indigo-400', 'bg-teal-400', 'bg-emerald-400', 'bg-cyan-400'];
    const textColors = ['text-blue-900', 'text-purple-900', 'text-indigo-900', 'text-teal-900', 'text-emerald-900', 'text-cyan-900'];
    const colorIndex = Math.floor((n - 1) / 10) % colors.length;

    return {
        id: `num-${n}`,
        label: n.toString(),
        word: getFrenchNumberWord(n),
        image: NUMBER_IMAGE_URL,
        color: colors[colorIndex],
        secondaryColor: textColors[colorIndex],
        category: 'numbers' as const,
    };
});
