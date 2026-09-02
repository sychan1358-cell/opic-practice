// 오픽 질문 은행 (IH~AL 대비)
// level: desc(묘사) | routine(습관/경향) | past(과거 경험) | compare(비교, IH+) | issue(이슈, AL)

const SELF_INTRO = {
  id: 'self-intro',
  text: "Let's start the interview now. Tell me something about yourself.",
  ko: '자기소개',
};

const TOPICS = [
  {
    id: 'home',
    name: '집 / 거주지',
    icon: '🏠',
    questions: [
      { level: 'desc', text: 'I would like to know where you live. Describe your home to me. What does it look like? Give me as many details as possible.' },
      { level: 'desc', text: 'Tell me about your favorite room in your home. What is it like, and why do you like spending time there?' },
      { level: 'desc', text: 'Describe your neighborhood. What can you see and do around where you live? What do you like about it?' },
      { level: 'routine', text: 'What do you usually do at home on weekends? Tell me about your typical weekend routine at home.' },
      { level: 'routine', text: 'What household chores do you usually do at home? When and how do you do them? Tell me in detail.' },
      { level: 'past', text: 'Tell me about a memorable experience that happened at your home. What happened, who was involved, and why was it so memorable?' },
      { level: 'past', text: 'Have you ever had a problem at home, such as something breaking or a noisy neighbor? Tell me what happened and how you solved it.' },
      { level: 'past', text: 'Tell me about a time when you had guests over at your home. What did you do to prepare, and how did it go?' },
      { level: 'compare', text: 'How is the home you live in now different from the home you lived in as a child? Compare the two homes in detail.' },
      { level: 'compare', text: 'Compare living in an apartment with living in a house. What are the advantages and disadvantages of each?' },
      { level: 'issue', text: 'Housing is a big issue in many countries. What are some housing-related problems people in your country are concerned about these days, and how are they dealing with them?' },
    ],
  },
  {
    id: 'movies',
    name: '영화 보기',
    icon: '🎬',
    questions: [
      { level: 'desc', text: 'You indicated in the survey that you like watching movies. What kind of movies do you like watching? Why do you like them?' },
      { level: 'desc', text: 'Who is your favorite actor or actress? Tell me about them and explain why you like them.' },
      { level: 'desc', text: 'Describe a movie theater you often go to. What does it look like, and what facilities does it have?' },
      { level: 'routine', text: 'When and where do you usually watch movies? Who do you usually go with? Tell me everything about your movie-going routine.' },
      { level: 'routine', text: 'What do you usually do before and after watching a movie? Tell me about a typical day when you go to see a movie.' },
      { level: 'past', text: 'Tell me about the most memorable movie you have ever seen. What was it about, and why was it so memorable to you?' },
      { level: 'past', text: 'Tell me about a time when something unexpected happened while you were at the movies. What happened and how did you handle it?' },
      { level: 'past', text: 'Tell me about the first movie you remember watching when you were young. Who did you watch it with, and what do you remember about it?' },
      { level: 'compare', text: 'How have movies changed over the years? Compare the movies people watched when you were young to the movies people watch today.' },
      { level: 'compare', text: 'Compare watching movies at a theater with watching movies at home. Which do you prefer, and why?' },
      { level: 'issue', text: 'Streaming services have changed the way people watch movies. What impact have they had on movie theaters, and what do people think about this change?' },
    ],
  },
  {
    id: 'music',
    name: '음악 감상',
    icon: '🎵',
    questions: [
      { level: 'desc', text: 'You indicated that you enjoy listening to music. What kind of music do you like? Who are your favorite musicians or singers?' },
      { level: 'desc', text: 'Tell me about your favorite singer or band. What makes their music special to you?' },
      { level: 'routine', text: 'When and where do you usually listen to music? What devices do you use to listen to music? Tell me in detail.' },
      { level: 'routine', text: 'How do you find new music to listen to? Tell me about how you discover new songs or artists.' },
      { level: 'past', text: 'How did you first become interested in music? Tell me about how your taste in music has developed since you were young.' },
      { level: 'past', text: 'Have you ever been to a live concert or music performance? Tell me about that experience in detail.' },
      { level: 'past', text: 'Tell me about a song that brings back special memories. What is the song, and what memories does it remind you of?' },
      { level: 'compare', text: 'Compare the music you listened to when you were younger with the music you listen to now. How has your taste changed?' },
      { level: 'compare', text: 'Compare how people listened to music in the past with how they listen to music today. What has changed?' },
      { level: 'issue', text: 'The way people consume music has changed dramatically. Talk about how technology has changed the music industry and what issues musicians face these days.' },
    ],
  },
  {
    id: 'park',
    name: '공원 가기',
    icon: '🌳',
    questions: [
      { level: 'desc', text: 'You indicated that you like going to parks. Describe your favorite park. Where is it and what does it look like?' },
      { level: 'desc', text: 'What kinds of people do you usually see at the park, and what are they doing? Describe a typical scene at the park.' },
      { level: 'routine', text: 'How often do you go to the park, and what do you usually do there? Who do you usually go with?' },
      { level: 'routine', text: 'What do you usually bring with you when you go to the park? Tell me how you prepare for a day at the park.' },
      { level: 'past', text: 'Tell me about a memorable experience you had at a park. What happened, and why do you remember it so well?' },
      { level: 'past', text: 'Tell me about the last time you went to a park. When was it, who were you with, and what did you do?' },
      { level: 'past', text: 'Have you ever seen an event or festival at a park? Tell me about what you saw and did there.' },
      { level: 'compare', text: 'How have parks changed since you were a child? Compare parks in the past with parks today.' },
      { level: 'issue', text: 'Why do you think parks and green spaces are important for cities? What efforts are being made in your country to protect them?' },
    ],
  },
  {
    id: 'beach',
    name: '해변 가기',
    icon: '🏖️',
    questions: [
      { level: 'desc', text: 'You indicated that you like going to the beach. Describe your favorite beach. What does it look like, and why do you like it?' },
      { level: 'desc', text: 'What do people usually do at beaches in your country? Describe a typical scene at a popular beach.' },
      { level: 'routine', text: 'What do you usually do when you go to the beach? Who do you go with, and what do you bring? Tell me in detail.' },
      { level: 'routine', text: 'How do you usually get to the beach, and how do you prepare for a beach trip? Walk me through the whole process.' },
      { level: 'past', text: 'Tell me about the most memorable trip to the beach you have ever taken. What made it so special?' },
      { level: 'past', text: 'Have you ever had an unexpected or funny experience at the beach? Tell me the whole story from beginning to end.' },
      { level: 'past', text: 'Tell me about the first time you went to a beach. How old were you, who were you with, and what do you remember?' },
      { level: 'compare', text: 'Compare the beach you visited as a child with beaches you visit now. How have beaches changed over the years?' },
      { level: 'issue', text: 'Pollution at beaches has become a concern in many places. What problems do beaches in your country face, and what is being done about them?' },
    ],
  },
  {
    id: 'travel',
    name: '국내/해외 여행',
    icon: '✈️',
    questions: [
      { level: 'desc', text: 'You indicated that you like to travel. Which places do you like to visit in your country, and why do you like traveling there?' },
      { level: 'desc', text: 'Tell me about a country or city you would love to visit someday. Why do you want to go there?' },
      { level: 'routine', text: 'What do you usually do to prepare before going on a trip? Tell me about everything you do before traveling.' },
      { level: 'routine', text: 'What do you usually do when you travel? Tell me about the activities you typically enjoy on a trip.' },
      { level: 'past', text: 'Tell me about the most memorable trip you have ever taken. Where did you go, who were you with, and what made it so memorable?' },
      { level: 'past', text: 'Travel does not always go as planned. Tell me about a problem you experienced while traveling and how you dealt with it.' },
      { level: 'past', text: 'Tell me about a trip you took when you were young. Where did you go, and what do you remember most about it?' },
      { level: 'past', text: 'Tell me about the last trip you took. Where did you go, what did you do, and how was it?' },
      { level: 'compare', text: 'How has traveling changed over the years? Compare how people traveled in the past with how they travel today.' },
      { level: 'compare', text: 'Compare traveling domestically with traveling abroad. What are the good and bad points of each?' },
      { level: 'issue', text: 'Overtourism has become a serious issue in many popular destinations. What problems does it cause, and what are people or governments doing about it?' },
    ],
  },
  {
    id: 'cafe',
    name: '카페 가기',
    icon: '☕',
    questions: [
      { level: 'desc', text: 'You indicated that you go to cafes. Describe your favorite cafe. What does it look like, and what makes it special?' },
      { level: 'desc', text: 'What do cafes in your country typically look like, and what do they serve? Describe a typical cafe scene.' },
      { level: 'routine', text: 'When do you usually go to cafes, and what do you usually do there? Who do you usually go with?' },
      { level: 'routine', text: 'What do you usually order at a cafe? Tell me about your favorite drinks and snacks and why you like them.' },
      { level: 'past', text: 'Tell me about a memorable experience you had at a cafe. What happened, and why was it memorable?' },
      { level: 'past', text: 'Tell me about the first time you visited your favorite cafe. How did you find it, and what was your first impression?' },
      { level: 'compare', text: 'Compare cafes today with cafes in the past. How have they changed in terms of atmosphere, menu, and the reasons people visit them?' },
      { level: 'issue', text: 'There seem to be more and more cafes opening these days. Why do you think cafes have become so popular, and what does this trend say about society?' },
    ],
  },
  {
    id: 'exercise',
    name: '운동 (조깅/헬스)',
    icon: '🏃',
    questions: [
      { level: 'desc', text: 'You indicated that you exercise regularly. What kind of exercise do you do, and where do you usually do it?' },
      { level: 'desc', text: 'Describe the place where you usually work out. What does it look like, and what equipment or facilities does it have?' },
      { level: 'routine', text: 'Walk me through your typical workout routine. When do you exercise, how long, and what exactly do you do?' },
      { level: 'routine', text: 'What do you do before and after exercising? Tell me about your preparation and recovery routine.' },
      { level: 'past', text: 'How did you first start exercising? Tell me about how you became interested in working out.' },
      { level: 'past', text: 'Tell me about a memorable or unexpected experience you had while exercising. What happened?' },
      { level: 'past', text: 'Have you ever been injured while exercising, or seen someone get hurt? Tell me what happened and how it was handled.' },
      { level: 'compare', text: 'Compare the way you exercise now with the way you exercised in the past. How has your routine changed and why?' },
      { level: 'issue', text: 'Health and fitness have become major concerns in modern society. Why do you think people are so interested in fitness these days, and what challenges do they face in staying healthy?' },
    ],
  },
  {
    id: 'concert',
    name: '공연 보기',
    icon: '🎤',
    questions: [
      { level: 'desc', text: 'You indicated in the survey that you like going to performances or concerts. What kind of performances do you like to watch, and why do you like them?' },
      { level: 'desc', text: 'Tell me about a concert hall or performance venue you often go to. Where is it, and what does it look like inside?' },
      { level: 'routine', text: 'What do you usually do before and after watching a performance? Who do you usually go with? Tell me about a typical day when you go to a concert.' },
      { level: 'routine', text: 'How do you usually find out about performances and get tickets? Walk me through the whole process.' },
      { level: 'past', text: 'Tell me about the most memorable performance or concert you have ever seen. Who performed, and what made it so special?' },
      { level: 'past', text: 'Tell me about the first performance you ever saw. When was it, who were you with, and what do you remember about it?' },
      { level: 'past', text: 'Have you ever had something unexpected happen at a performance — like a delay, bad seats, or losing your ticket? Tell me the whole story.' },
      { level: 'compare', text: 'Compare concerts or performances today with those you watched in the past. How have they changed in terms of stage, technology, and audience culture?' },
      { level: 'issue', text: 'Ticket prices for popular concerts have become very expensive, and getting tickets is harder than ever. Why has this happened, and what do people think about this issue?' },
    ],
  },
  {
    id: 'shopping',
    name: '쇼핑',
    icon: '🛍️',
    questions: [
      { level: 'desc', text: 'Where do you usually go shopping? Describe your favorite place to shop and explain why you like it.' },
      { level: 'desc', text: 'Describe a popular shopping area or mall in your city. What can people do there besides shopping?' },
      { level: 'routine', text: 'How often do you go shopping, and what do you usually buy? Tell me about your typical shopping habits.' },
      { level: 'routine', text: 'What do you usually do when you shop online? Walk me through the process from searching to receiving the product.' },
      { level: 'past', text: 'Tell me about a memorable shopping experience you have had. What did you buy, and what made the experience memorable?' },
      { level: 'past', text: 'Have you ever bought something and then regretted it, or had to return it? Tell me the whole story.' },
      { level: 'past', text: 'Tell me about the last time you went shopping. What did you buy, where did you go, and who were you with?' },
      { level: 'compare', text: 'Compare shopping in stores with shopping online. What are the advantages and disadvantages of each? Which do you prefer and why?' },
      { level: 'compare', text: 'How has shopping changed since you were a child? Compare the way people shopped in the past with the way they shop today.' },
      { level: 'issue', text: 'Online shopping has changed the retail industry significantly. What problems has this created for traditional stores, and how are they responding?' },
    ],
  },
];

// 돌발 주제
const SURPRISE_TOPICS = [
  {
    id: 'recycling',
    name: '재활용',
    icon: '♻️',
    questions: [
      { level: 'desc', text: 'Tell me about recycling in your country. How do people recycle, and what kinds of things do they recycle?' },
      { level: 'routine', text: 'How do you recycle at home? Walk me through what you do with your recyclables step by step.' },
      { level: 'past', text: 'Tell me about a memorable experience related to recycling. Perhaps a problem you had or something unusual that happened.' },
      { level: 'past', text: 'How did you first learn about recycling? Tell me about how recycling became a part of your daily life.' },
      { level: 'compare', text: 'Compare how people recycled in the past with how they recycle now. What has changed?' },
      { level: 'issue', text: 'Why has recycling become such an important issue? What problems can occur when people do not recycle properly?' },
    ],
  },
  {
    id: 'weather',
    name: '날씨 / 계절',
    icon: '🌦️',
    questions: [
      { level: 'desc', text: 'Tell me about the seasons in your country. What is the weather like in each season?' },
      { level: 'desc', text: 'What is your favorite season, and why? What do you usually do during that season?' },
      { level: 'desc', text: 'What is the weather like today where you live? And what is the typical weather like this time of year?' },
      { level: 'past', text: 'Tell me about a time when extreme weather affected your plans. What happened, and what did you do?' },
      { level: 'past', text: 'Tell me about a memorable experience related to the weather, such as a heavy snowstorm or a heatwave. What happened?' },
      { level: 'compare', text: 'Compare the weather in your country with the weather in another country you know about. How are they different?' },
      { level: 'issue', text: 'Many people say the weather has been changing due to climate change. How has the weather in your country changed, and what concerns do people have?' },
    ],
  },
  {
    id: 'bank',
    name: '은행',
    icon: '🏦',
    questions: [
      { level: 'desc', text: 'Tell me about banks in your country. What do they look like, and what services do they offer?' },
      { level: 'desc', text: 'Describe the bank you usually go to. Where is it, and what does it look like inside?' },
      { level: 'routine', text: 'How often do you go to the bank, and what do you usually do there? Do you use online banking? Tell me in detail.' },
      { level: 'past', text: 'Tell me about a memorable or frustrating experience you had at a bank. What happened, and how was it resolved?' },
      { level: 'past', text: 'Tell me about the first time you opened a bank account. When was it, and what was the process like?' },
      { level: 'compare', text: 'Compare banking today with banking in the past. How has technology changed the way people use banks?' },
    ],
  },
  {
    id: 'transport',
    name: '교통',
    icon: '🚇',
    questions: [
      { level: 'desc', text: 'Tell me about the transportation system in your country. How do people usually get around?' },
      { level: 'desc', text: 'Describe the public transportation in your city. What options are there, and what are they like?' },
      { level: 'routine', text: 'How do you usually get to work or school? Describe your typical commute in detail.' },
      { level: 'past', text: 'Tell me about a problem you experienced while using public transportation. What happened, and how did you deal with it?' },
      { level: 'past', text: 'Tell me about a time when you were stuck in traffic or your bus or train was delayed. What happened, and what did you do?' },
      { level: 'compare', text: 'How has transportation in your country changed over the years? Compare it with the past.' },
      { level: 'issue', text: 'What transportation problems does your city face, such as traffic jams or crowded subways? What is being done to solve them?' },
    ],
  },
  {
    id: 'internet',
    name: '인터넷 / 기술',
    icon: '💻',
    questions: [
      { level: 'desc', text: 'What do people in your country usually do on the internet? Tell me about how people use the internet in daily life.' },
      { level: 'routine', text: 'What do you usually do on the internet? Tell me about the websites or apps you use most often and why.' },
      { level: 'routine', text: 'How much time do you spend on your phone each day, and what do you mainly use it for? Tell me in detail.' },
      { level: 'past', text: 'Tell me about a time when you had a problem with the internet or your phone. What happened, and how did you solve it?' },
      { level: 'past', text: 'Tell me about your first computer or smartphone. When did you get it, and how did it change your life?' },
      { level: 'compare', text: 'Compare how people used the internet in the past with how they use it now. What has changed the most?' },
      { level: 'issue', text: 'People are increasingly concerned about problems related to the internet, such as privacy and addiction. What issues are people in your country worried about, and why?' },
    ],
  },
  {
    id: 'health',
    name: '건강 / 병원',
    icon: '🏥',
    questions: [
      { level: 'desc', text: 'What do people in your country do to stay healthy? Tell me about some common health habits.' },
      { level: 'desc', text: 'Tell me about hospitals or clinics in your country. What are they like, and how do people use them?' },
      { level: 'routine', text: 'What do you do to take care of your health? Tell me about your health routine, including diet and exercise.' },
      { level: 'past', text: 'Tell me about a time when you or someone you know was sick or injured. What happened, and what did you do?' },
      { level: 'past', text: 'Tell me about your last visit to a hospital or a doctor. Why did you go, and what was the experience like?' },
      { level: 'compare', text: 'Compare people\'s health habits today with their habits in the past. Are people healthier now? Why or why not?' },
      { level: 'issue', text: 'What health issues are people in your country most concerned about these days, and what is being done about them?' },
    ],
  },
  {
    id: 'holidays',
    name: '명절 / 휴일',
    icon: '🎉',
    questions: [
      { level: 'desc', text: 'Tell me about a major holiday in your country. What do people do, and what foods do they eat?' },
      { level: 'routine', text: 'What do you usually do during holidays? Tell me about how you and your family typically spend a major holiday.' },
      { level: 'past', text: 'Tell me about a memorable holiday you spent when you were a child. What did you do, and why was it memorable?' },
      { level: 'past', text: 'Tell me about the most recent holiday you celebrated. What did you do, who were you with, and how was it?' },
      { level: 'compare', text: 'How have holiday celebrations changed over time in your country? Compare the past with the present.' },
      { level: 'issue', text: 'Some people say traditional holidays are losing their meaning these days. What do you think about this, and why is it happening?' },
    ],
  },
  {
    id: 'furniture',
    name: '가구 / 가전제품',
    icon: '🛋️',
    questions: [
      { level: 'desc', text: 'Tell me about the furniture in your home. Which piece of furniture is your favorite, and why?' },
      { level: 'desc', text: 'What appliances do you have at home, and which one do you use the most? Tell me why it is so useful.' },
      { level: 'past', text: 'Tell me about a time when a piece of furniture or an appliance in your home broke. What happened, and how did you handle it?' },
      { level: 'past', text: 'Tell me about a piece of furniture or an appliance you bought recently. Why did you buy it, and how do you like it?' },
      { level: 'compare', text: 'Compare the appliances people use today with the ones people used in the past. How have they changed people\'s lives?' },
      { level: 'issue', text: 'Smart home appliances are becoming more common. What do people think about them, and what advantages and concerns do they bring?' },
    ],
  },
  {
    id: 'fashion',
    name: '패션 / 옷',
    icon: '👕',
    questions: [
      { level: 'desc', text: 'What kind of clothes do people in your country usually wear? Tell me about the fashion trends these days.' },
      { level: 'routine', text: 'What kind of clothes do you usually wear? Does your style change depending on the occasion? Tell me in detail.' },
      { level: 'routine', text: 'Where do you usually buy your clothes, and how do you decide what to buy? Tell me about your clothes-shopping habits.' },
      { level: 'past', text: 'Tell me about a time when you bought clothes for a special occasion. What did you buy, and how did the occasion go?' },
      { level: 'compare', text: 'How has fashion in your country changed over the years? Compare what people wore in the past with what they wear now.' },
      { level: 'issue', text: 'Fast fashion has become controversial because of its environmental impact. What do people in your country think about this issue?' },
    ],
  },
  {
    id: 'appointment',
    name: '약속',
    icon: '📅',
    questions: [
      { level: 'routine', text: 'What kind of appointments or gatherings do you usually have with friends or family? Tell me about them.' },
      { level: 'routine', text: 'How do you usually make plans with your friends? Tell me about the process from deciding to meet to actually meeting.' },
      { level: 'past', text: 'Tell me about a time when you had to cancel or change an appointment. What happened, and how did you handle it?' },
      { level: 'past', text: 'Tell me about a particularly memorable gathering or meeting with friends. What did you do, and why was it memorable?' },
      { level: 'past', text: 'Tell me about a time when someone was very late for an appointment with you, or you were late. What happened?' },
      { level: 'compare', text: 'Compare how people made appointments in the past with how they make them now. How has technology changed this?' },
    ],
  },
];

// 롤플레이 세트 (11번: 질문하기, 12번: 문제 해결, 13번: 관련 경험)
const ROLEPLAYS = [
  {
    id: 'rp-movie',
    name: '영화 티켓',
    icon: '🎟️',
    q11: "I'd like to give you a situation and ask you to act it out. You want to see a movie with your friend this weekend. Call the movie theater and ask three or four questions about the movie you want to see.",
    q12: "I'm sorry, but there is a problem I need you to resolve. You arrived at the theater, but you found out that the tickets you booked are for the wrong date. Call your friend, explain the situation, and give two or three alternatives.",
    q13: "That's the end of the situation. Have you ever had a problem with tickets or a reservation? Tell me about what happened and how you resolved it.",
  },
  {
    id: 'rp-travel',
    name: '여행 예약',
    icon: '🧳',
    q11: "I'd like to give you a situation and ask you to act it out. You are planning a trip and want to book a hotel. Call the hotel and ask three or four questions about the room and facilities.",
    q12: "I'm sorry, but there is a problem I need you to resolve. You arrived at the hotel, but they cannot find your reservation. Explain the situation to the front desk and offer two or three solutions.",
    q13: "That's the end of the situation. Have you ever had a problem with a hotel or accommodation while traveling? Tell me what happened and how you dealt with it.",
  },
  {
    id: 'rp-restaurant',
    name: '식당 예약',
    icon: '🍽️',
    q11: "I'd like to give you a situation and ask you to act it out. You want to have dinner with your family at a new restaurant. Call the restaurant and ask three or four questions about the menu and making a reservation.",
    q12: "I'm sorry, but there is a problem I need you to resolve. The restaurant called and said they have to cancel your reservation. Call your family member, explain the situation, and suggest two or three alternatives.",
    q13: "That's the end of the situation. Have you ever had a disappointing experience at a restaurant? Tell me what happened and how you handled it.",
  },
  {
    id: 'rp-store',
    name: '전자제품 구매',
    icon: '📱',
    q11: "I'd like to give you a situation and ask you to act it out. You want to buy a new phone. Go to the store and ask the salesperson three or four questions about the phone you want to buy.",
    q12: "I'm sorry, but there is a problem I need you to resolve. The phone you bought stopped working after a few days. Call the store, explain the problem, and give two or three options to solve the situation.",
    q13: "That's the end of the situation. Have you ever bought something that was broken or did not work properly? Tell me what happened and how you resolved the problem.",
  },
  {
    id: 'rp-concert',
    name: '콘서트',
    icon: '🎤',
    q11: "I'd like to give you a situation and ask you to act it out. Your friend invited you to a concert. Call your friend and ask three or four questions about the concert.",
    q12: "I'm sorry, but there is a problem I need you to resolve. Something urgent came up and you cannot go to the concert. Call your friend, explain why you cannot go, and suggest two or three alternatives.",
    q13: "That's the end of the situation. Have you ever had to cancel plans with a friend at the last minute? Tell me about that experience.",
  },
  {
    id: 'rp-gym',
    name: '헬스장 등록',
    icon: '💪',
    q11: "I'd like to give you a situation and ask you to act it out. You want to join a gym near your house. Call the gym and ask three or four questions about membership and facilities.",
    q12: "I'm sorry, but there is a problem I need you to resolve. You found out the gym is closing for a month for renovations. Call the gym, explain your situation, and ask about two or three options for your membership.",
    q13: "That's the end of the situation. Have you ever experienced an unexpected closure or cancellation of a service you were using? Tell me what happened and how you dealt with it.",
  },
  {
    id: 'rp-party',
    name: '파티 초대',
    icon: '🥳',
    q11: "I'd like to give you a situation and ask you to act it out. Your friend is having a birthday party. Call your friend and ask three or four questions about the party.",
    q12: "I'm sorry, but there is a problem I need you to resolve. On the day of the party, your car broke down and you will be very late. Call your friend, explain the situation, and offer two or three solutions.",
    q13: "That's the end of the situation. Have you ever been late to an important event? Tell me what happened, why you were late, and how everything turned out.",
  },
  {
    id: 'rp-bank',
    name: '은행 업무',
    icon: '💳',
    q11: "I'd like to give you a situation and ask you to act it out. You need to open a new bank account. Call the bank and ask three or four questions about opening an account.",
    q12: "I'm sorry, but there is a problem I need you to resolve. You lost your credit card. Call the bank, explain the situation, and ask two or three questions about what you should do.",
    q13: "That's the end of the situation. Have you ever lost something important, like a wallet or a phone? Tell me what happened and how you resolved the situation.",
  },
  {
    id: 'rp-rental',
    name: '자전거 대여',
    icon: '🚲',
    q11: "I'd like to give you a situation and ask you to act it out. You want to rent a bicycle for the weekend. Call the rental shop and ask three or four questions about renting a bike.",
    q12: "I'm sorry, but there is a problem I need you to resolve. The bicycle you rented got a flat tire far from the shop. Call the rental shop, explain the situation, and suggest two or three solutions.",
    q13: "That's the end of the situation. Have you ever had something you rented or borrowed break down? Tell me what happened and how you handled it.",
  },
  {
    id: 'rp-doctor',
    name: '병원 예약',
    icon: '🩺',
    q11: "I'd like to give you a situation and ask you to act it out. You are not feeling well and need to see a doctor. Call the clinic and ask three or four questions about making an appointment.",
    q12: "I'm sorry, but there is a problem I need you to resolve. Something came up at work and you cannot make it to your appointment. Call the clinic, explain the situation, and ask about two or three ways to reschedule.",
    q13: "That's the end of the situation. Have you ever had to change or cancel an important appointment? Tell me what happened and how it turned out.",
  },
];

// AL 대비 고난도 세트 (14-15번 유형)
const ADVANCED_SETS = [
  {
    topic: '기술',
    q14: 'Compare how people communicated in the past with how they communicate today. How has technology changed our relationships?',
    q15: 'Some people say that technology has made our lives more convenient but less personal. What is your opinion on this issue? Support your opinion with specific examples.',
  },
  {
    topic: '여행',
    q14: 'Compare traveling alone with traveling in a group. What are the advantages and disadvantages of each?',
    q15: 'Tourism can bring both benefits and problems to a country. What impact does tourism have on your country, and what do people think about it?',
  },
  {
    topic: '건강',
    q14: 'Compare the lifestyle of people today with the lifestyle of people twenty years ago. Are people healthier now than before?',
    q15: 'Work-life balance has become a hot topic in modern society. Why has this issue become so important, and what changes are companies and governments making?',
  },
  {
    topic: '환경',
    q14: 'Compare how people thought about the environment in the past with how they think about it now. What has caused this change?',
    q15: 'Environmental problems are a global concern. What environmental issues are people in your country most worried about, and what efforts are being made to solve them?',
  },
  {
    topic: '교육',
    q14: 'Compare education when you were a student with education today. What are the biggest differences?',
    q15: 'Online education has become very common. Do you think online learning can replace traditional classroom education? Give reasons and examples to support your opinion.',
  },
  {
    topic: '주거',
    q14: 'Compare living in a big city with living in a small town or the countryside. What are the pros and cons of each?',
    q15: 'Many young people find it difficult to buy a home these days. Why has this become such a serious issue, and what solutions are being discussed in your country?',
  },
];

// 실전 모의고사 생성: 15문항, 난이도 1~6 (실제 오픽 자가평가와 동일)
// 1: 묘사/습관만 | 2~3: +과거 경험 | 4: +비교 | 5: +고난도 14-15번 | 6: 비교/이슈 최대 비중
function difficultyFilter(level) {
  const L = parseInt(level, 10);
  if (L <= 1) return (q) => ['desc', 'routine'].includes(q.level);
  if (L <= 3) return (q) => ['desc', 'routine', 'past'].includes(q.level);
  if (L <= 5) return (q) => q.level !== 'issue';
  return null; // 6: 전체 허용
}

// 난이도별 세트 내 문항 유형 순서 (실제 오픽처럼 묘사→습관→경험 순으로 난이도 상승)
function levelSeq(L) {
  if (L <= 1) return ['desc', 'routine', 'desc'];
  if (L <= 3) return ['desc', 'routine', 'past'];
  if (L <= 5) return ['desc', 'past', 'compare'];
  return ['desc', 'past', 'issue'];
}

// 실제 오픽 구성:
// 1번 자기소개(채점 제외) | 2-4 세트1: 서베이 주제 | 5-7 세트2: 서베이 또는 돌발
// 8-10 세트3: 돌발 | 11-13 세트4: 롤플레이 | 14-15 세트5: 어드밴스(난이도 5-6만)
// surveyIds: 사용자가 서베이에서 고른 주제 id 배열 (없으면 전체 주제 사용)
function buildMockExam(difficulty = '5', surveyIds = null) {
  const L = Math.min(6, Math.max(1, parseInt(difficulty, 10) || 5));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);
  const LEVEL_ORDER = { desc: 0, routine: 1, past: 2, compare: 3, issue: 4 };
  const seq = levelSeq(L);

  // 선택주제는 내 서베이 주제에서만 출제 (3개 미만이면 다른 주제로 보충)
  let surveyed = (surveyIds && surveyIds.length) ? TOPICS.filter((t) => surveyIds.includes(t.id)) : [...TOPICS];
  const nonSurveyed = TOPICS.filter((t) => !surveyed.includes(t));
  if (surveyed.length < 3) surveyed = surveyed.concat(shuffled(nonSurveyed).slice(0, 3 - surveyed.length));

  const [topicA, topicB, topicC] = shuffled(surveyed).slice(0, 3);
  // 돌발 풀: 난이도 4 이상이면 서베이에 없는 선택주제에서도 돌발 출제 (실제 오픽처럼)
  const surprisePool = L >= 4 ? [...SURPRISE_TOPICS, ...nonSurveyed] : [...SURPRISE_TOPICS];
  const surprise3 = pick(surprisePool);
  // 세트2: 서베이 주제 또는 돌발 주제 (50%) — 세트3과는 다른 돌발 주제 보장
  const useSurpriseForSet2 = Math.random() < 0.5;
  const surprise2Pool = surprisePool.filter((t) => t !== surprise3);
  const set2Topic = useSurpriseForSet2 && surprise2Pool.length ? pick(surprise2Pool) : topicB;

  const rp = pick(ROLEPLAYS);
  const adv = pick(ADVANCED_SETS);

  // 원하는 유형 순서(levels)대로 세트 구성 — 해당 유형이 없으면 가장 가까운 유형으로 대체
  const pickSeq = (topic, levels) => {
    const used = new Set();
    return levels.map((lv) => {
      let pool = topic.questions.filter((q) => q.level === lv && !used.has(q));
      if (!pool.length) {
        pool = topic.questions
          .filter((q) => !used.has(q))
          .sort((a, b) => Math.abs(LEVEL_ORDER[a.level] - LEVEL_ORDER[lv]) - Math.abs(LEVEL_ORDER[b.level] - LEVEL_ORDER[lv]));
        pool = pool.slice(0, 2); // 가장 가까운 유형 중에서 랜덤
      }
      const q = pick(pool);
      if (q) used.add(q);
      return q;
    }).filter(Boolean).map((q) => ({ topic: `${topic.icon} ${topic.name}`, text: q.text }));
  };

  const roleplay = [
    { topic: `${rp.icon} 롤플레이 (질문하기)`, text: rp.q11 },
    { topic: `${rp.icon} 롤플레이 (문제해결)`, text: rp.q12 },
    { topic: `${rp.icon} 롤플레이 (관련경험)`, text: rp.q13 },
  ];

  // 세트5 (14-15번): 난이도 5-6은 어드밴스 문제, 이하는 세 번째 서베이 주제 세트
  const ending = L >= 5
    ? [
        { topic: `🔥 어드밴스 (${adv.topic} 비교)`, text: adv.q14 },
        { topic: `🔥 어드밴스 (${adv.topic} 이슈)`, text: adv.q15 },
      ]
    : pickSeq(topicC, seq.slice(0, 2));

  const exam = [
    { topic: '👤 자기소개 (채점 제외)', text: SELF_INTRO.text },
    ...pickSeq(topicA, seq),
    ...pickSeq(set2Topic, seq),
    ...pickSeq(surprise3, seq),
    ...roleplay,
    ...ending,
  ];
  return exam.map((q, i) => ({ ...q, number: i + 1 }));
}
