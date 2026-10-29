// Word bank: category -> list of secret words.
const WORDS = {
  "Food": [
    "Pizza", "Sushi", "Hamburger", "Pancakes", "Taco", "Spaghetti", "Ice Cream",
    "Popcorn", "Chocolate", "Boerewors", "Biltong", "Bunny Chow", "Croissant",
    "Doughnut", "Hot Dog", "Curry", "Salad", "Cheese", "Watermelon", "Banana",
    "Bobotie", "Koeksister", "Vetkoek", "Pap", "Lasagne", "Burrito", "Waffles",
    "Fish and Chips", "Pineapple", "Strawberry", "Avocado", "Mushroom", "Toast",
    "Soup", "Cupcake", "Steak", "Noodles", "Peanut Butter", "Lollipop", "Omelette"
  ],
  "Animals": [
    "Elephant", "Giraffe", "Penguin", "Lion", "Shark", "Octopus", "Kangaroo",
    "Zebra", "Owl", "Snake", "Dolphin", "Hippo", "Rhino", "Cheetah", "Monkey",
    "Crocodile", "Bee", "Horse", "Flamingo", "Tortoise", "Leopard", "Buffalo",
    "Meerkat", "Ostrich", "Warthog", "Hyena", "Gorilla", "Panda", "Koala",
    "Polar Bear", "Wolf", "Fox", "Squirrel", "Bat", "Peacock", "Parrot",
    "Spider", "Butterfly", "Jellyfish", "Whale"
  ],
  "Places": [
    "Beach", "Airport", "Hospital", "School", "Supermarket", "Cinema", "Library",
    "Zoo", "Gym", "Church", "Restaurant", "Museum", "Prison", "Stadium",
    "Casino", "Farm", "Space Station", "Submarine", "Hotel", "Bank",
    "Shopping Mall", "Train Station", "Petrol Station", "Police Station",
    "Fire Station", "Post Office", "Theme Park", "Campsite", "Swimming Pool",
    "Bowling Alley", "Nightclub", "Car Wash", "Laundromat", "Pharmacy",
    "Bakery", "Barbershop", "Office", "Castle", "Lighthouse", "Volcano"
  ],
  "Objects": [
    "Umbrella", "Toothbrush", "Guitar", "Laptop", "Scissors", "Mirror", "Candle",
    "Backpack", "Clock", "Camera", "Pillow", "Hammer", "Key", "Sunglasses",
    "Ladder", "Wallet", "Remote Control", "Kettle", "Balloon", "Fridge",
    "Toaster", "Microwave", "Vacuum Cleaner", "Hairdryer", "Spoon", "Fork",
    "Frying Pan", "Light Bulb", "Torch", "Book", "Pencil", "Calculator",
    "Headphones", "Phone Charger", "Paintbrush", "Teddy Bear", "Dice",
    "Tape Measure", "Padlock", "Bucket"
  ],
  "Jobs": [
    "Doctor", "Firefighter", "Teacher", "Chef", "Pilot", "Police Officer",
    "Astronaut", "Plumber", "Farmer", "Dentist", "Lawyer", "Mechanic", "Artist",
    "Scientist", "Waiter", "Hairdresser", "Lifeguard", "Electrician", "Judge", "DJ",
    "Nurse", "Vet", "Architect", "Accountant", "Journalist", "Photographer",
    "Soldier", "Builder", "Taxi Driver", "Bus Driver", "Cashier", "Librarian",
    "Baker", "Butcher", "Fisherman", "Magician", "Clown", "Actor", "Game Ranger",
    "Security Guard"
  ],
  "Sports": [
    "Rugby", "Soccer", "Cricket", "Tennis", "Golf", "Swimming", "Basketball",
    "Boxing", "Surfing", "Skiing", "Cycling", "Volleyball", "Baseball",
    "Hockey", "Darts", "Bowling", "Chess", "Karate", "Skateboarding", "Netball",
    "Badminton", "Squash", "Table Tennis", "Wrestling", "Fencing", "Archery",
    "Rowing", "Sailing", "Diving", "Gymnastics", "Marathon", "Triathlon",
    "Formula 1", "Horse Racing", "Rock Climbing", "Snowboarding", "Ice Skating",
    "Snooker", "Water Polo", "Paintball"
  ],
  "Movies & TV": [
    "Titanic", "Harry Potter", "Star Wars", "Shrek", "The Lion King", "Frozen",
    "Jurassic Park", "Batman", "Spider-Man", "Friends", "The Simpsons",
    "Toy Story", "Finding Nemo", "Avatar", "Game of Thrones", "Stranger Things",
    "The Office", "James Bond", "Barbie", "Minions", "Home Alone", "Rocky",
    "The Matrix", "Pirates of the Caribbean", "The Avengers", "Superman",
    "Ghostbusters", "Back to the Future", "Indiana Jones", "Mr Bean",
    "SpongeBob", "Squid Game", "Breaking Bad", "Grey's Anatomy", "Top Gun",
    "Mamma Mia", "Cars", "Madagascar", "Kung Fu Panda", "The Hunger Games"
  ],
  "Countries": [
    "South Africa", "Australia", "Brazil", "Canada", "China", "Egypt", "France",
    "Germany", "Greece", "India", "Ireland", "Italy", "Jamaica", "Japan",
    "Kenya", "Mexico", "Morocco", "Netherlands", "New Zealand", "Nigeria",
    "Norway", "Portugal", "Russia", "Scotland", "Spain", "Sweden",
    "Switzerland", "Thailand", "Turkey", "United States", "England", "Argentina",
    "Iceland", "Namibia", "Zimbabwe", "Mozambique", "Finland",
    "Peru", "South Korea", "Vietnam"
  ],
  "Vehicles": [
    "Bicycle", "Motorbike", "Bus", "Train", "Taxi", "Ambulance", "Fire Truck",
    "Police Car", "Tractor", "Helicopter", "Aeroplane", "Hot Air Balloon",
    "Rocket", "Sailboat", "Cruise Ship", "Speedboat", "Canoe", "Jet Ski",
    "Skateboard", "Scooter", "Golf Cart", "Limousine", "Monster Truck",
    "Ice Cream Truck", "Garbage Truck", "Cement Mixer", "Forklift", "Bulldozer",
    "Tank", "Tuk-Tuk", "Minibus Taxi", "Caravan", "Quad Bike", "Segway",
    "Cable Car", "Gondola", "Hovercraft", "Spaceship", "Rickshaw", "Sledge"
  ],
  "Clothing": [
    "T-Shirt", "Jeans", "Hoodie", "Jacket", "Raincoat", "Dress", "Skirt",
    "Shorts", "Pyjamas", "Swimsuit", "Suit", "Tie", "Bow Tie", "Scarf",
    "Beanie", "Cap", "Cowboy Hat", "Crown", "Socks", "Slippers", "Sneakers",
    "High Heels", "Flip-Flops", "Boots", "Gloves", "Belt", "Apron", "Wedding Dress",
    "Tuxedo", "Onesie", "Bikini", "Tracksuit", "Uniform", "Cape", "Mask",
    "Wig", "Watch", "Necklace", "Earrings", "Handbag"
  ],
  "Music": [
    "Piano", "Drums", "Violin", "Trumpet", "Saxophone", "Flute", "Harp",
    "Cello", "Ukulele", "Banjo", "Harmonica", "Accordion", "Bagpipes",
    "Tambourine", "Triangle", "Xylophone", "Microphone", "Concert", "Choir",
    "Orchestra", "Karaoke", "Rap", "Rock and Roll", "Jazz", "Opera", "Amapiano",
    "Kwaito", "Reggae", "Country Music", "Heavy Metal", "Lullaby",
    "National Anthem", "Music Festival", "Boy Band", "Record Player",
    "Headliner", "Encore", "Music Video", "Talent Show", "Busker"
  ],
  "South Africa": [
    "Braai", "Table Mountain", "Kruger Park", "Robben Island", "Springboks",
    "Bafana Bafana", "Vuvuzela", "Load Shedding", "Robot (Traffic Light)",
    "Shebeen", "Spaza Shop", "Rooibos", "Mrs Ball's Chutney", "Chakalaka",
    "Melktert", "Rusks", "Potjiekos", "Boerie Roll", "Gatsby", "Durban July",
    "Comrades Marathon", "Garden Route", "Drakensberg", "Soweto", "Cape Town",
    "Johannesburg", "Durban", "Bloemfontein", "Sun City", "Gold Reef City",
    "Protea", "Kalahari", "Big Five", "Boulders Beach", "Safari",
    "Taxi Rank", "Jacaranda", "Highveld Storm", "Lekker", "Heritage Day"
  ]
};
