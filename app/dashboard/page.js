// useState, useEffect 등 react hook은 클라이언트 사이드에서만 실행되므로, 클라이언트 컴포넌트임을 선언하는 것 
"use client";

// react hook
import { useState, useEffect, useRef } from "react";

// next.js 
import { useRouter } from "next/navigation";
import Link from "next/link";

// firebase 
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { query, orderBy, collection, onSnapshot, addDoc, doc, getDoc, setDoc, serverTimestamp, writeBatch, where, getDocs } from "firebase/firestore";

// shadcn
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

// lucide-react 
import { Plus, X, Trash2, Search, ArrowLeft, Heart  } from "lucide-react";

// export default: 다른 곳에서 import 할 수 있게 함 (ex. import Dashboard from "./Dashboard")
// 다른 곳에서 import 할 수 있는 함수형 컴포넌트를 정의 
export default function Dashboard() {

  // useState() : react에서 상태를 관리하는 hook 
  // state 정보와 setter 함수가 배열[]로 정의됨 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [newVideo, setNewVideo] = useState({ name: "", video: "", thumbnail: "", channel: "", views: "", likes: "", publishedAt: "", channelProfile: "" });
  const [search, setSearch] = useState("");
  const [fabOpen, setFabOpen] = useState(false);
  const [isOn, setIsOn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [searchMode, setSearchMode] = useState(false);

  // useRef(): 컴포넌트가 렌더링 되어도 값을 유지하는 참조 객체를 생성하는 hook 
  const fabRef = useRef(null);

  // useRouter(): 페이지 이동을 관리하는 hook 
  const router = useRouter();

  // vercel 환경 변수로 저장해둔 youtube api key
  // 반드시 "NEXT_PUBLIC_~"가 붙어야 함 
  const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  // useEffect: 컴포넌트가 렌더링될 때 실행되는 react hook 
  useEffect(() => {

    // onAuthStateChanged(auth, callback): 사용자의 로그인 상태 변경을 감지하는 firebase authentication의 이벤트 리스너 
    const unsubscribe = onAuthStateChanged(auth, async(currentUser) => {

      // 현재 사용자와 현재 사용자의 이메일을, 각각 user와 userEmail로 설정 
      if (currentUser) {
        setUser(currentUser);
        setUserEmail(currentUser.email);

        try {
          // 현재 사용자의 mode 데이터를 가져옴 
          const userDocRef = doc(db, "users", currentUser.uid); // db 경로 정의
          const userDocSnap = await getDoc(userDocRef); // 해당 db 경로의 문서 불러옴 
  
          if (userDocSnap.exists() && userDocSnap.data().Mode) {
            setIsOn(userDocSnap.data().Mode === "public"); // mode 값이 public이면, isOn은 true 
          } else {
            setIsOn(false); // mode 값이 false면 isOn은 false 
          }
        } catch (error) {
          console.error("사용자 Mode 데이터를 가져오는 중 오류 발생:", error);
          setIsOn(false); // 오류 발생 시 기본값 설정
        }

        // 현재 사용자 정보가 없다면 로그인하지 않았다는 의미이므로,
        // 로그인 페이지로 이동 & userEmail도 초기화 
      } else {
        router.push("/");
        setUserEmail("")
      }

      // 로그인 상태 파악을 마친 후, loading 마침 
      setLoading(false);
    });

    // 간단히 표현하면
    // useEffect (() => {
    // const unsubcribe = onAuthStateChanged(auth, callback);
    // return () => unsubscribe();
    // }, []); 
    // '컴포넌트가 rendering 되면, 정의한 unsubscribe 함수를 return하세요'인 것 + 이벤트 리스너 해제 
    return () => unsubscribe();

  // 의존성 배열에 router 포함 -> router 값이 변경될 때마다 실행 
  }, [router]);


  // useEffect: 컴포넌트가 렌더링될 때 실행되는 react hook 
  useEffect(() => {

    // 로그인하지 않은 user는 이후 코드를 실행하지 않음 
    if (!user) return;

    // 현재 user의 고유 ID 
    const userId = auth.currentUser?.uid;

    // isOn 값에 따라 데이터를 불러올 db 경로를 설정 
    const collectionPath = isOn 
    ? collection(db, "gallery")  // isOn: true -> gallery 컬렉션 사용
    : collection(db, "users", userId, "videos");  // isOn: false -> users/videos 컬렉션 사용

    // isOn 값에 따라 상이한 경로에서 데이터를 불러온 후,
    // isOn 값에 따라 상이한 정렬 기준으로 데이터 정렬 
    const q = isOn
    ? query(collectionPath, orderBy("recommend", "desc"))
    : query(collectionPath, orderBy("createdAt", "desc"))

    // onSnapshot: firestore 데이터를 실시간으로 감지하는 이벤트 리스너 
    // snapshot: firestore에서 가져온 쿼리 전체 결과
    // snapshot.dpcs: 쿼리 전체 결과 중 문서(docs)
    // .map(): 각 문서를 딕셔너리로 변환 
    const unsubscribe = onSnapshot(q, (snapshot) => { 
      setVideos(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))); 
    });

    // 정의한 unsubscribe 함수를 return, 이벤트 리스너 해제 
    return () => unsubscribe();

  // 의존성 배열에 user, isOn 포함 -> user나 isOn 값이 변경될 때마다 실행 
  }, [user, isOn]);

  useEffect(() => {

    function handleClickOutside(event) {

      // 앞서 const fabRef = useRef(null); 로 정의
      // useRef를 사용해 현재 사용자가 위치한(current) DOM 요소를 참조함 
      // event.target: 사용자가 클릭한 요소 
      // 사용자가 위치한 DOM요소가 사용자가 클릭한 요소를 포함하고 있지 않으면(사용자가 fab 버튼 외부를 클릭했으면)
      // fabOpen 상태를 false, 즉 fab 버튼이 닫힌 상태로 설정 
      if (fabRef.current && !fabRef.current.contains(event.target)) {
        setFabOpen(false);
      }
    }

    // "mousedown": 마우스 클릭을 감지하는 이벤트 리스너
    // 마우스가 클릭되었을 때 handleClickOutside 함수를 실행함 (바로 위) 
    document.addEventListener("mousedown", handleClickOutside);

    // 이벤트 리스너를 해제하며 return 
    return () => document.removeEventListener("mousedown", handleClickOutside);

  // 의존성 배열이 비어있음 -> 컴포넌트가 최초 렌더링(마운트) 될 때 한 번만 실행되고, 이후 실행되지 않음
  }, []);

  const getYoutubeVideoDetails = async (url) => {
    try {
      // 유튜브 영상 ID 추출 정규식
      const pattern = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|embed|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]+)/;
      const match = url.match(pattern);
  
      // 영상 ID가 없으면 에러 처리
      if (!match || !match[1]) throw new Error("유효한 YouTube 링크가 아닙니다.");
      
      const videoId = match[1]; // 올바른 영상 ID 추출 
  
      // 📌 유튜브 영상 정보 가져오기
      const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`);
      const videoData = await videoResponse.json();
  
      // 비디오 정보 확인
      if (!videoData.items || videoData.items.length === 0) throw new Error("비디오 정보를 가져올 수 없습니다.");
      
      const videoInfo = videoData.items[0];
      const { title, channelTitle, publishedAt, thumbnails, channelId } = videoInfo.snippet;
      const { viewCount, likeCount } = videoInfo.statistics;
  
      // 📌 유튜브 채널 정보 가져오기
      const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`);
      const channelData = await channelResponse.json();
  
      // 채널 정보 확인
      if (!channelData.items || channelData.items.length === 0) throw new Error("채널 정보를 가져올 수 없습니다.");
      
      const channelProfile = channelData.items[0].snippet.thumbnails.default.url;
  
      // 📌 최종 결과 반환
      return {
        name: title,
        video: url,
        thumbnail: thumbnails.high.url,
        channel: channelTitle,
        channelProfile: channelProfile, 
        views: viewCount,
        likes: likeCount,
        publishedAt: publishedAt.slice(0, 10),
        createdAt: serverTimestamp(),
      };
    } catch (error) {
      console.error("YouTube API 오류:", error);
      return null;
    }
  };
  

  const handleInputChange = async (e) => {
    const url = e.target.value;
    setNewVideo({ ...newVideo, video: url });
  };

  const handleAddVideo = async () => {
    if (!user || !newVideo.video) return;
    try {
      const videoDetails = await getYoutubeVideoDetails(newVideo.video);
      if (!videoDetails) return;
      const userId = auth.currentUser.uid;

      const collectionPath = collection(db, "users", userId, "videos"); 

      await addDoc(collectionPath, {
        ...videoDetails,
        recommend: 0, // ✅ 여기에서 recommend 필드 추가
      });
      setNewVideo({ name: "", video: "", thumbnail: "", channel: "", views: "", likes: "", publishedAt: "", channelProfile: "", createdAt: serverTimestamp(), recommend: 0 });
      setFabOpen(false);
    } catch (error) {
      console.error("Firestore에 비디오 추가 중 오류 발생: ", error);
    }
  };

  const getYouTubeVideoID = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/.*v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/.*#p\/u\/\d\/|youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^#&?\n]+)/);
    return match ? match[1] : null;
  };

  const handleToggleMode = async () => {
    if (!user) return;
  
    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, "users", userId); // ✅ Firestore에서 해당 유저 문서 참조
  
    const newMode = isOn ? "private" : "public"; // ✅ 상태 반전 후 적용할 모드 설정
  
    try {
      await setDoc(userDocRef, { Mode: newMode }, { merge: true }); // ✅ Firestore에 Mode 필드 저장 (merge: true 옵션으로 기존 데이터 유지)
      setIsOn(!isOn); // ✅ 상태 업데이트
    } catch (error) {
      console.error("Firestore 모드 업데이트 오류:", error);
    }
  };

  const sortedVideos = [...videos].sort((a, b) => {
    if (isOn) {
      return Number(b.recommend) - Number(a.recommend); // recommend 기준 내림차순
    } else {
      return new Date(b.createdAt) - new Date(a.createdAt); // 업로드 날짜 기준 최신순
    }
  });

  function getEmailUsername(email) {
    if (!email || typeof email !== "string") return "";
    return email.split("@")[0];
  }

  return (
    <div className="rounded-lg shadow-lg max-w-2xl w-full flex flex-col p-6 relative mx-auto">
      <div className="flex items-center max-w-[600px] w-full h-10 space-x-2 justify-end">
        <p className="text-gray-500 text-sm font-pretendard">{getEmailUsername(userEmail)} 님</p>
        <p onClick={() => signOut(auth)} className="cursor-pointer text-gray-500 text-sm font-pretendard underline">로그아웃</p>
      </div>
      <div className="flex items-center justify-between max-w-[600px] w-full h-16 px-4 bg-transparent border border-gray-500 rounded text-white">
        {/* 왼쪽 아이콘 */}
        {searchMode ? (
          <button onClick={() => setSearchMode(false)} className="text-black cursor-pointor">
            <ArrowLeft size={24} />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full overflow-hidden bg-black flex items-center justify-center">
            <img src="/deep_logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
        )}

        {/* 검색 입력창 */}
        {searchMode && (
          <input
            type="text"
            className="flex-1 ml-4 px-2 py-1 text-black rounded bg-gray-100"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}

        <div className = "flex items-center space-x-6">
          {/* 돋보기 버튼 */}
          {!searchMode && (
            <button onClick={() => setSearchMode(true)} className="text-black">
              <Search size={24} />
            </button>
          )}

          {user && !searchMode && (
            <Link href={"/dashboard/likes"} passHref><Heart size={24} className="cursor-pointer text-black" /></Link>
          )}
                  
        </div>
      </div>

      <div className="flex items-center max-w-[600px] w-full h-10 space-x-2 justify-end">
        <Switch checked={isOn} onCheckedChange={(checked) => handleToggleMode(checked)} />
        <span>{isOn ? "Public" : "Private"}</span>
      </div>


      { !isOn && (
        <div className="z-10 fixed bottom-6 right-6 flex flex-col items-end" ref={fabRef}>
          {fabOpen && (
            <div className="relative px-4 py-2 w-[350px] transition-transform transform translate-y-2 opacity-100 mb-2">
              <div className="relative flex items-center bg-gray-100 rounded-lg px-4 py-2">
                <Input 
                  type="text" 
                  placeholder="Youtube URL" 
                  value={newVideo.video} 
                  onChange={handleInputChange} 
                  className="flex-1 bg-gray-100 focus:outline-none text-gray-700" 
                />
                <Button 
                  onClick={handleAddVideo} 
                  className="ml-2 h-10 px-4 rounded-full bg-black text-white font-bold text-sm"
                >
                  추가
                </Button>
              </div>
            </div>
          )}
          <Button 
            onClick={() => setFabOpen(!fabOpen)} 
            className="rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          >
            {fabOpen ? <X size={24} /> : <Plus size={24} />}
          </Button>
        </div>
      )}


      <div className="grid grid-cols-1 gap-6 mt-2 w-full max-w-6xl">
        {sortedVideos
          .filter((video) => video.name.toLowerCase().includes(search.toLowerCase()))
          .map((video) => (
            <Card key={video.id} className="w-full max-w-[600px] rounded-lg shadow-lg cursor-pointer hover:shadow-2xl transition relative">
              <Link key={video.id} href={`/dashboard/${video.id}`} passHref>
                <div className="relative w-full aspect-video">
                  <iframe
                    className="w-full h-full rounded-t-lg"
                    src={`https://www.youtube.com/embed/${getYouTubeVideoID(video.video)}?autoplay=0&controls=1`}
                    title={video.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </Link>
              <CardContent className="p-4">
                <Link key={video.id} href={`dashboard/${video.id}`} passHref>
                  <div className="flex items-center space-x-3">
                    {/* 채널 프로필 이미지 */}
                    <img src={video.channelProfile} alt={video.channel} className="w-10 h-10 rounded-full object-cover" />

                    {/* 영상 제목 및 채널 정보 */}
                    <div className="flex flex-col flex-1">
                      {/* 영상 제목 */}
                      <h3 className="text-lg font-bold mb-2">{video.name}</h3>
            
                      {/* 채널명, 조회수, 게시일 */}
                      <p className="text-sm text-gray-500">
                        {video.channel} · {video.views} views · {new Date(video.publishedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </CardContent>
              {!isOn && (
                <button
                  onClick={async () => {
                    if (!video || !video.video) return alert("삭제할 비디오 데이터가 없습니다.");
                    if (!user?.uid) return alert("사용자 정보가 없습니다.");

                    try {
                      const batch = writeBatch(db);

                      // 🔥 users/{user.uid}/videos에서 video.video와 일치하는 문서 찾기
                      const userVideosRef = collection(db, "users", user.uid, "videos");
                      const userQuery = query(userVideosRef, where("video", "==", video.video));
                      const userQuerySnapshot = await getDocs(userQuery);

                      userQuerySnapshot.forEach((doc) => {
                        batch.delete(doc.ref); // 🔥 users/{user.uid}/videos 문서 삭제
                      });

                      // 🔥 gallery에서 video.video와 일치하는 문서 찾기
                      const galleryRef = collection(db, "gallery");
                      const galleryQuery = query(galleryRef, where("video", "==", video.video));
                      const galleryQuerySnapshot = await getDocs(galleryQuery);

                      galleryQuerySnapshot.forEach((doc) => {
                        batch.delete(doc.ref); // 🔥 gallery 문서 삭제
                      });

                      // 🔥 모든 삭제 작업 실행
                      await batch.commit();

                      alert("비디오가 삭제되었습니다.");
                      router.push("/dashboard");
                    } catch (error) {
                      console.error("비디오 삭제 중 오류 발생: ", error);
                      alert("삭제 중 오류가 발생했습니다.");
                    }
                  }}
                  className="z-5 absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                >
                  <Trash2 size={32} />
                </button>

              )}
            </Card>
          ))}
      </div>
    </div>
  );
}