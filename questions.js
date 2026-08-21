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
      { level: 'routine', text: 'What do you usually do at home on weekends? Tell me about your typical weekend routine at home.' },
      { level: 'past', text: 'Tell me about a memorable experience that happened at your home. What happened, who was involved, and why was it so memorable?' },
      { level: 'compare', text: 'How is the home you live in now different from the home you lived in as a child? Compare the two homes in detail.' },
      { level: 'issue', text: 'Housing is a big issue in many countries. What are some housing-related problems people in your country are concerned about these days, and how are they dealing with them?' },
    ],
  },
  {
    id: 'movies',
    name: '영화 보기',
    icon: '🎬',
    questions: [
      { level: 'desc', text: 'You indicated in the survey that you like watching movies. What kind of movies do you like watching? Why do you like them?' },
      { level: 'routine', text: 'When and where do you usually watch movies? Who do you usually go with? Tell me everything about your movie-going routine.' },
      { level: 'past', text: 'Tell me about the most memorable movie you have ever seen. What was it about, and why was it so memorable to you?' },
      { level: 'past', text: 'Tell me about a time when something unexpected happened while you were at the movies. What happened and how did you handle it?' },
      { level: 'compare', text: 'How have movies changed over the years? Compare the movies people watched when you were young to the movies people watch today.' },
      { level: 'issue', text: 'Streaming services have changed the way people watch movies. What impact have they had on movie theaters, and what do people think about this change?' },
    ],
  },
  {
    id: 'music',
    name: '음악 감상',
    icon: '🎵',
    questions: [
      { level: 'desc', text: 'You indicated that you enjoy listening to music. What kind of music do you like? Who are your favorite musicians or singers?' },
      { level: 'routine', text: 'When and where do you usually listen to music? What devices do you use to listen to music? Tell me in detail.' },
      { level: 'past', text: 'How did you first become interested in music? Tell me about how your taste in music has developed since you were young.' },
      { level: 'past', text: 'Have you ever been to a live concert or music performance? Tell me about that experience in detail.' },
      { level: 'compare', text: 'Compare the music you listened to when you were younger with the music you listen to now. How has your taste changed?' },
      { level: 'issue', text: 'The way people consume music has changed dramatically. Talk about how technology has changed the music industry and what issues musicians face these days.' },
    ],
  },
  {
    id: 'park',
    name: '공원 가기',
    icon: '🌳',
    questions: [
      { level: 'desc', text: 'You indicated that you like going to parks. Describe your favorite park. Where is it and what does it look like?' },
      { level: 'routine', text: 'How often do you go to the park, and what do you usually do there? Who do you usually go with?' },
      { level: 'past', text: 'Tell me about a memorable experience you had at a park. What happened, and why do you remember it so well?' },
      { level: 'compare', text: 'How have parks changed since you were a child? Compare parks in the past with parks today.' },
    ],
  },
  {
    id: 'beach',
    name: '해변 가기',
    icon: '🏖️',
    questions: [
      { level: 'desc', text: 'You indicated that you like going to the beach. Describe your favorite beach. What does it look like, and why do you like it?' },
      { level: 'routine', text: 'What do you usually do when you go to the beach? Who do you go with, and what do you bring? Tell me in detail.' },
      { level: 'past', text: 'Tell me about the most memorable trip to the beach you have ever taken. What made it so special?' },
      { level: 'past', text: 'Have you ever had an unexpected or funny experience at the beach? Tell me the whole story from beginning to end.' },
    ],
  },
  {
    id: 'travel',
    name: '국내/해외 여행',
    icon: '✈️',
    questions: [
      { level: 'desc', text: 'You indicated that you like to travel. Which places do you like to visit in your country, and why do you like traveling there?' },
      { level: 'routine', text: 'What do you usually do to prepare before going on a trip? Tell me about everything you do before traveling.' },
      { level: 'past', text: 'Tell me about the most memorable trip you have ever taken. Where did you go, who were you with, and what made it so memorable?' },
      { level: 'past', text: 'Travel does not always go as planned. Tell me about a problem you experienced while traveling and how you dealt with it.' },
      { level: 'compare', text: 'How has traveling changed over the years? Compare how people traveled in the past with how they travel today.' },
      { level: 'issue', text: 'Overtourism has become a serious issue in many popular destinations. What problems does it cause, and what are people or governments doing about it?' },
    ],
  },
  {
    id: 'cafe',
    name: '카페 가기',
    icon: '☕',
    questions: [
      { level: 'desc', text: 'You indicated that you go to cafes. Describe your favorite cafe. What does it look like, and what makes it special?' },
      { level: 'routine', text: 'When do you usually go to cafes, and what do you usually do there? Who do you usually go with?' },
      { level: 'past', text: 'Tell me about a memorable experience you had at a cafe. What happened, and why was it memorable?' },
      { level: 'compare', text: 'Compare cafes today with cafes in the past. How have they changed in terms of atmosphere, menu, and the reasons people visit them?' },
    ],
  },
  {
    id: 'exercise',
    name: '운동 (조깅/헬스)',
    icon: '🏃',
    questions: [
      { level: 'desc', text: 'You indicated that you exercise regularly. What kind of exercise do you do, and where do you usually do it?' },
      { level: 'routine', text: 'Walk me through your typical workout routine. When do you exercise, how long, and what exactly do you do?' },
      { level: 'past', text: 'How did you first start exercising? Tell me about how you became interested in working out.' },
      { level: 'past', text: 'Tell me about a memorable or unexpected experience you had while exercising. What happened?' },
      { level: 'issue', text: 'Health and fitness have become major concerns in modern society. Why do you think people are so interested in fitness these days, and what challenges do they face in staying healthy?' },
    ],
  },
  {
    id: 'shopping',
    name: '쇼핑',
    icon: '🛍️',
    questions: [
      { level: 'desc', text: 'Where do you usually go shopping? Describe your favorite place to shop and explain why you like it.' },
      { level: 'routine', text: 'How often do you go shopping, and what do you usually buy? Tell me about your typical shopping habits.' },
      { level: 'past', text: 'Tell me about a memorable shopping experience you have had. What did you buy, and what made the experience memorable?' },
      { level: 'compare', text: 'Compare shopping in stores with shopping online. What are the advantages and disadvantages of each? Which do you prefer and why?' },
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
      { level: 'past', text: 'Tell me about a time when extreme weather affected your plans. What happened, and what did you do?' },
      { level: 'issue', text: 'Many people say the weather has been changing due to climate change. How has the weather in your country changed, and what concerns do people have?' },
    ],
  },
  {
    id: 'bank',
    name: '은행',
    icon: '🏦',
    questions: [
      { level: 'desc', text: 'Tell me about banks in your country. What do they look like, and what services do they offer?' },
      { level: 'routine', text: 'How often do you go to the bank, and what do you usually do there? Do you use online banking? Tell me in detail.' },
      { level: 'past', text: 'Tell me about a memorable or frustrating experience you had at a bank. What happened, and how was it resolved?' },
      { level: 'compare', text: 'Compare banking today with banking in the past. How has technology changed the way people use banks?' },
    ],
  },
  {
    id: 'transport',
    name: '교통',
    icon: '🚇',
    questions: [
      { level: 'desc', text: 'Tell me about the transportation system in your country. How do people usually get around?' },
      { level: 'routine', text: 'How do you usually get to work or school? Describe your typical commute in detail.' },
      { level: 'past', text: 'Tell me about a problem you experienced while using public transportation. What happened, and how did you deal with it?' },
      { level: 'compare', text: 'How has transportation in your country changed over the years? Compare it with the past.' },
    ],
  },
  {
    id: 'internet',
    name: '인터넷 / 기술',
    icon: '💻',
    questions: [
      { level: 'routine', text: 'What do you usually do on the internet? Tell me about the websites or apps you use most often and why.' },
      { level: 'past', text: 'Tell me about a time when you had a problem with the internet or your phone. What happened, and how did you solve it?' },
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
      { level: 'routine', text: 'What do you do to take care of your health? Tell me about your health routine, including diet and exercise.' },
      { level: 'past', text: 'Tell me about a time when you or someone you know was sick or injured. What happened, and what did you do?' },
      { level: 'issue', text: 'What health issues are people in your country most concerned about these days, and what is being done about them?' },
    ],
  },
  {
    id: 'holidays',
    name: '명절 / 휴일',
    icon: '🎉',
    questions: [
      { level: 'desc', text: 'Tell me about a major holiday in your country. What do people do, and what foods do they eat?' },
      { level: 'past', text: 'Tell me about a memorable holiday you spent when you were a child. What did you do, and why was it memorable?' },
      { level: 'compare', text: 'How have holiday celebrations changed over time in your country? Compare the past with the present.' },
    ],
  },
  {
    id: 'furniture',
    name: '가구 / 가전제품',
    icon: '🛋️',
    questions: [
      { level: 'desc', text: 'Tell me about the furniture in your home. Which piece of furniture is your favorite, and why?' },
      { level: 'past', text: 'Tell me about a time when a piece of furniture or an appliance in your home broke. What happened, and how did you handle it?' },
      { level: 'compare', text: 'Compare the appliances people use today with the ones people used in the past. How have they changed people\'s lives?' },
    ],
  },
  {
    id: 'fashion',
    name: '패션 / 옷',
    icon: '👕',
    questions: [
      { level: 'desc', text: 'What kind of clothes do people in your country usually wear? Tell me about the fashion trends these days.' },
      { level: 'routine', text: 'What kind of clothes do you usually wear? Does your style change depending on the occasion? Tell me in detail.' },
      { level: 'compare', text: 'How has fashion in your country changed over the years? Compare what people wore in the past with what they wear now.' },
    ],
  },
  {
    id: 'appointment',
    name: '약속',
    icon: '📅',
    questions: [
      { level: 'routine', text: 'What kind of appointments or gatherings do you usually have with friends or family? Tell me about them.' },
      { level: 'past', text: 'Tell me about a time when you had to cancel or change an appointment. What happened, and how did you handle it?' },
      { level: 'past', text: 'Tell me about a particularly memorable gathering or meeting with friends. What did you do, and why was it memorable?' },
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
];

// 실전 모의고사 생성: 15문항
function buildMockExam() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffled = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const [topicA, topicB] = shuffled(TOPICS).slice(0, 2);
  const surprise = pick(SURPRISE_TOPICS);
  const rp = pick(ROLEPLAYS);
  const adv = pick(ADVANCED_SETS);

  const pickSet = (topic, n) => {
    const qs = shuffled(topic.questions).slice(0, n);
    return qs.map((q) => ({ topic: `${topic.icon} ${topic.name}`, text: q.text }));
  };

  return [
    { topic: '👤 자기소개', text: SELF_INTRO.text },
    ...pickSet(topicA, 3),
    ...pickSet(topicB, 3),
    ...pickSet(surprise, 3),
    { topic: `${rp.icon} 롤플레이 (질문하기)`, text: rp.q11 },
    { topic: `${rp.icon} 롤플레이 (문제해결)`, text: rp.q12 },
    { topic: `${rp.icon} 롤플레이 (관련경험)`, text: rp.q13 },
    { topic: `🔥 고난도 (${adv.topic} 비교)`, text: adv.q14 },
    { topic: `🔥 고난도 (${adv.topic} 이슈)`, text: adv.q15 },
  ].map((q, i) => ({ ...q, number: i + 1 }));
}
