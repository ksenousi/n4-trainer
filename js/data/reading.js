// Reading comprehension passages (N4 level): notices, short emails, short narratives.
// Each passage has 1-3 multiple-choice questions, each with 4 choices and correctIndex.
const READING_DATA = [
  {
    id: "r001",
    title: "お知らせ（図書館）",
    passage: "来週の月曜日から、図書館は午前9時から午後8時まで開いています。土曜日と日曜日は午後5時までです。本を返す人は、入り口の右にあるポストに入れてください。",
    questions: [
      { id:"r001q1", prompt:"図書館は土曜日、何時まで開いていますか。", choices:["午前9時まで","午後5時まで","午後8時まで","休みです"], correctIndex:1 },
      { id:"r001q2", prompt:"本を返す人はどうすればいいですか。", choices:["図書館の人にわたす","入り口のポストに入れる","電話する","月曜日に来る"], correctIndex:1 },
    ],
    translation: "Starting next Monday, the library is open from 9am to 8pm. On Saturdays and Sundays it's open until 5pm. People returning books should put them in the mailbox to the right of the entrance.",
  },
  {
    id: "r002",
    title: "メール（会議の連絡）",
    passage: "田中さん、お疲れ様です。明日の会議は10時からですが、場所が変わりました。3階の会議室Bでお願いします。資料は今日中に送ります。よろしくお願いします。",
    questions: [
      { id:"r002q1", prompt:"明日の会議はどこでありますか。", choices:["2階の会議室A","3階の会議室B","1階のロビー","田中さんの会社"], correctIndex:1 },
      { id:"r002q2", prompt:"資料はいつ送られますか。", choices:["明日の朝","会議の後","今日中","来週"], correctIndex:2 },
    ],
    translation: "Tanaka-san, thanks for your hard work. Tomorrow's meeting is at 10, but the location changed. Please come to Meeting Room B on the 3rd floor. I'll send the materials today.",
  },
  {
    id: "r003",
    title: "短い話（休みの日）",
    passage: "わたしは休みの日、よく公園で走ります。雨の日は走れないので、家で本を読んだり、料理をしたりします。先週は新しいレストランで友達とご飯を食べました。とても楽しかったです。",
    questions: [
      { id:"r003q1", prompt:"雨の日、この人は何をしますか。", choices:["公園で走る","本を読んだり料理をしたりする","友達と話す","レストランに行く"], correctIndex:1 },
      { id:"r003q2", prompt:"先週、この人は何をしましたか。", choices:["新しいレストランで食事をした","公園を走った","料理をおぼえた","旅行に行った"], correctIndex:0 },
    ],
    translation: "On my days off, I often run in the park. Since I can't run on rainy days, I read books or cook at home. Last week I ate at a new restaurant with a friend. It was a lot of fun.",
  },
  {
    id: "r004",
    title: "お知らせ（駐車場）",
    passage: "このビルの駐車場は、来月から有料になります。一時間100円です。最初の30分は無料です。駐車券は1階の受付でもらってください。",
    questions: [
      { id:"r004q1", prompt:"駐車場はいつから有料になりますか。", choices:["今月から","来月から","来年から","もう有料です"], correctIndex:1 },
      { id:"r004q2", prompt:"駐車券はどこでもらいますか。", choices:["2階の事務所","1階の受付","駐車場の入り口","インターネット"], correctIndex:1 },
    ],
    translation: "This building's parking lot will become paid starting next month. It's 100 yen per hour. The first 30 minutes are free. Please get a parking ticket at the reception on the 1st floor.",
  },
  {
    id: "r005",
    title: "メール（招待）",
    passage: "山田さん、来週の土曜日にうちでパーティーをします。よかったら来てください。場所はいつもの駅の近くの私の家です。何か食べ物を持ってきてもいいし、持ってこなくてもいいです。何時でも大丈夫です。",
    questions: [
      { id:"r005q1", prompt:"パーティーはいつありますか。", choices:["来週の土曜日","今週の日曜日","来月","今日"], correctIndex:0 },
      { id:"r005q2", prompt:"食べ物について、何と言っていますか。", choices:["必ず持ってきてください","持ってこなくてもいい","お金を払ってください","レストランに行く"], correctIndex:1 },
    ],
    translation: "Yamada-san, I'm having a party at my house next Saturday. Please come if you can. It's at my house near the usual station. You can bring food or not, either is fine. Any time is okay.",
  },
  {
    id: "r006",
    title: "短い話（仕事を始めたころ）",
    passage: "私が初めてこの会社で働き始めたとき、何も分かりませんでした。先輩がいろいろ教えてくれたので、少しずつ仕事に慣れました。今では新しい人に教える立場になりました。",
    questions: [
      { id:"r006q1", prompt:"働き始めたとき、この人はどうでしたか。", choices:["全部わかっていた","何も分からなかった","先輩より上手だった","休みが多かった"], correctIndex:1 },
      { id:"r006q2", prompt:"今、この人は何をしていますか。", choices:["新しい人に仕事を教えている","会社をやめた","まだ何も分からない","学校に行っている"], correctIndex:0 },
    ],
    translation: "When I first started working at this company, I didn't understand anything. My senior taught me various things, so I gradually got used to the work. Now I'm in the position of teaching new people.",
  },
  {
    id: "r007",
    title: "お知らせ（地震）",
    passage: "今日の午後2時ごろ、この地域で地震がありました。今のところ、けがをした人はいません。エレベーターが止まっていますので、階段を使ってください。",
    questions: [
      { id:"r007q1", prompt:"地震の後、けがをした人はいますか。", choices:["たくさんいる","今のところいない","全員けがをした","分からない"], correctIndex:1 },
      { id:"r007q2", prompt:"今、何を使わなければなりませんか。", choices:["エレベーター","階段","電車","タクシー"], correctIndex:1 },
    ],
    translation: "Around 2pm today, there was an earthquake in this area. So far, no one has been injured. The elevator is stopped, so please use the stairs.",
  },
  {
    id: "r008",
    title: "メール（出張）",
    passage: "課長、お疲れ様です。来週の出張ですが、ホテルを予約しました。駅から歩いて5分のホテルです。新幹線のチケットは明日買う予定です。何か質問があれば教えてください。",
    questions: [
      { id:"r008q1", prompt:"ホテルは駅からどのくらいですか。", choices:["歩いて5分","車で5分","歩いて30分","駅の中"], correctIndex:0 },
      { id:"r008q2", prompt:"新幹線のチケットはいつ買いますか。", choices:["今日","明日","来週","もう買った"], correctIndex:1 },
    ],
    translation: "Section chief, thanks for your hard work. Regarding next week's business trip, I booked a hotel. It's a 5-minute walk from the station. I plan to buy the shinkansen ticket tomorrow. Let me know if you have any questions.",
  },
  {
    id: "r009",
    title: "短い話（料理が好きな理由）",
    passage: "私は料理をするのが好きです。子供のとき、母が作った料理を見て、おいしそうだと思いました。それから、自分でも作ってみたいと思うようになりました。今は週末に新しい料理を作ることが楽しみです。",
    questions: [
      { id:"r009q1", prompt:"この人はいつから料理に興味を持ちましたか。", choices:["大人になってから","子供のとき","結婚してから","会社に入ってから"], correctIndex:1 },
      { id:"r009q2", prompt:"今、この人はいつ料理をしますか。", choices:["毎日","週末","母と一緒のとき","旅行のとき"], correctIndex:1 },
    ],
    translation: "I like cooking. As a child, I watched my mother cook and thought it looked delicious. After that, I started wanting to try cooking myself. Now, making new dishes on weekends is something I look forward to.",
  },
  {
    id: "r010",
    title: "お知らせ（健康診断）",
    passage: "今年の健康診断は、4月10日から4月20日までです。会社の3階で行います。診断を受ける人は、前の日の夜から何も食べないでください。水は飲んでも大丈夫です。",
    questions: [
      { id:"r010q1", prompt:"健康診断はどこでありますか。", choices:["会社の3階","病院","2階の会議室","家"], correctIndex:0 },
      { id:"r010q2", prompt:"診断の前の日の夜、何をしてはいけませんか。", choices:["水を飲む","寝る","何かを食べる","シャワーを浴びる"], correctIndex:2 },
    ],
    translation: "This year's health check is from April 10 to April 20. It's held on the 3rd floor of the company. Those taking the checkup should not eat anything from the night before. Drinking water is okay.",
  },
  {
    id: "r011",
    title: "メール（返事が遅れたお詫び）",
    passage: "鈴木さん、メールをありがとうございます。返事が遅くなって、すみませんでした。先週、出張に行っていて、メールを見る時間がありませんでした。いただいた質問について、来週お話しできますか。",
    questions: [
      { id:"r011q1", prompt:"なぜ返事が遅くなりましたか。", choices:["メールを見るのを忘れた","出張に行っていた","病気だった","休みだった"], correctIndex:1 },
      { id:"r011q2", prompt:"この人は何をしたいと言っていますか。", choices:["来週、話をしたい","もう一度メールを送りたい","会社をやめたい","旅行に行きたい"], correctIndex:0 },
    ],
    translation: "Suzuki-san, thank you for your email. I'm sorry for the late reply. I was on a business trip last week and didn't have time to check email. Could we talk next week about the question you asked?",
  },
  {
    id: "r012",
    title: "短い話（引っ越し）",
    passage: "来月、新しいアパートに引っ越します。今のアパートより駅に近いので、便利になると思います。でも、今の部屋より少し狭いです。引っ越しの日は、友達に手伝ってもらう予定です。",
    questions: [
      { id:"r012q1", prompt:"新しいアパートはどんな所ですか。", choices:["駅から遠い","駅に近いが狭い","今の部屋より広い","会社に近い"], correctIndex:1 },
      { id:"r012q2", prompt:"引っ越しの日、誰が手伝いますか。", choices:["家族","友達","会社の人","誰も手伝わない"], correctIndex:1 },
    ],
    translation: "I'm moving to a new apartment next month. It's closer to the station than my current apartment, so I think it will be more convenient. But it's a bit smaller than my current room. On moving day, a friend is going to help me.",
  },
  {
    id: "r013",
    title: "お知らせ（図書館の休み）",
    passage: "今月の29日から来月の3日まで、図書館はお休みです。本を借りている人は、休みの前の28日までに返してください。返さない場合、来月10日まで新しい本を借りることができません。",
    questions: [
      { id:"r013q1", prompt:"本はいつまでに返さなければなりませんか。", choices:["29日","28日","来月3日","来月10日"], correctIndex:1 },
      { id:"r013q2", prompt:"本を返さないと、どうなりますか。", choices:["お金を払う","来月10日まで本を借りられない","図書館に入れない","何も問題ない"], correctIndex:1 },
    ],
    translation: "The library is closed from the 29th of this month to the 3rd of next month. People who have borrowed books should return them by the 28th, before the closure. If you don't return them, you won't be able to borrow new books until the 10th of next month.",
  },
  {
    id: "r014",
    title: "短い話（日本語の勉強）",
    passage: "私は3年前から日本語を勉強しています。最初はひらがなも読めませんでしたが、毎日少しずつ練習して、今では新聞も読めるようになりました。来年は日本に留学するつもりです。",
    questions: [
      { id:"r014q1", prompt:"この人は今、何ができますか。", choices:["ひらがなが読めない","新聞が読める","日本に住んでいる","先生として働いている"], correctIndex:1 },
      { id:"r014q2", prompt:"来年、この人は何をするつもりですか。", choices:["日本語の先生になる","日本に留学する","新しい仕事を始める","結婚する"], correctIndex:1 },
    ],
    translation: "I've been studying Japanese for 3 years. At first I couldn't even read hiragana, but by practicing a little every day, I can now even read newspapers. I intend to study abroad in Japan next year.",
  },
  {
    id: "r015",
    title: "メール（プレゼントのお礼）",
    passage: "美咲さん、誕生日のプレゼントをありがとうございました。とてもかわいいカップで、毎朝コーヒーを飲むときに使っています。今度、お礼に晩ご飯をご一緒しませんか。",
    questions: [
      { id:"r015q1", prompt:"プレゼントは何でしたか。", choices:["本","カップ","花","かばん"], correctIndex:1 },
      { id:"r015q2", prompt:"この人はいつカップを使いますか。", choices:["夜ご飯のとき","毎朝コーヒーを飲むとき","パーティーのとき","使わない"], correctIndex:1 },
    ],
    translation: "Misaki-san, thank you for the birthday present. It's a very cute cup, and I use it every morning when I drink coffee. Would you like to have dinner together sometime as thanks?",
  },
  {
    id: "r016",
    title: "お知らせ（台風）",
    passage: "明日、台風がこの地域に来る予定です。学校は休みになります。風が強くなるので、外に出ないでください。電車も止まるかもしれません。",
    questions: [
      { id:"r016q1", prompt:"明日、学校はどうなりますか。", choices:["いつもと同じ","休みになる","早く終わる","遠足がある"], correctIndex:1 },
      { id:"r016q2", prompt:"この知らせは何について言っていますか。", choices:["地震","台風","祭り","会議"], correctIndex:1 },
    ],
    translation: "A typhoon is expected to hit this area tomorrow. School will be closed. Since the wind will get strong, please don't go outside. Trains may also stop.",
  },
];
