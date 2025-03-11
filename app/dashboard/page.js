// useState, useEffect 등 react hook은 클라이언트 사이드에서만 실행되므로, 클라이언트 컴포넌트임을 선언하는 것 
"use client";

// react hook
import { useState, useEffect, useRef } from "react";

// next.js 
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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

    // Firestore 쿼리 설정
    let q;

    if (isOn) {
        // 🔥 isOn이 true → isPosted 필드가 true인 video만 가져오기
        q = query(
            collection(db, "gallery"), 
            where("isPosted", "==", true), 
            orderBy("recommend", "desc")
        );
    } else {
        // 🔥 isOn이 false → currentUser.uid와 gallery/{firstSlug} 문서의 userId 값이 일치하고, isPosted 필드가 false인 video만 가져오기
        q = query(
            collection(db, "gallery"), 
            where("userId", "==", userId),
            where("isPosted", "==", false),
            orderBy("createdAt", "desc")
        );
    }

    // Firestore 실시간 감지
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setVideos(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    // 정리 함수: 컴포넌트가 unmount될 때 리스너 해제
    return () => unsubscribe();

// 의존성 배열에 user, isOn 포함 → user나 isOn 값이 변경될 때마다 실행
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

  // youtube 영상들의 세부 정보를 youtube api를 이용해 가져옴, input: url 
  const getYoutubeVideoDetails = async (url) => {
    try {

      // pattern과 url을 match (형식을 맞춰봄) 
      const pattern = /(?:youtu\.be\/|youtube\.com\/.*[?&]v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/user\/.*#p\/u\/\d\/|youtube\.com\/watch\?.*?v=)([a-zA-Z0-9_-]{11})/;
      const match = url.match(pattern);
  
      // 만약 match되지 않는다면 에러 메시지 출력 
      if (!match || !match[1]) throw new Error("유효한 YouTube 링크가 아닙니다.");
      
      // 만약 match된다면 \/ 사이의 값(videID에 해당)을 videoId 변수에 저장 
      const videoId = match[1];
  
      // videoId 값을 바탕으로, youtube api를 이용해 video 정보를 가져옴
      // 이때 youtube api key를 발급받아 전달해야 하며, 불러온 video 정보는 json 파일로 저장 
      const videoResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`);
      const videoData = await videoResponse.json();

      // video 정보가 담긴 json 파일(A)에서, 'item' key에 해당하는 value가 존재하는지 확인하기 
      if (!videoData.items || videoData.items.length === 0) throw new Error("비디오 정보를 가져올 수 없습니다.");
      
      // 'item' key에 해당하는 value 역시 리스트(A-item)이며, 해당 리스트에서 첫 번째 값을 받아오는데, 그 값이 딕셔너리(A-item-1)임
      // 'snippet' key의 value에 해당하는 딕셔너리(A-item-1-snippet)는, title, channelTitle, publishedAt, thumbnails, channelId를 key로 가지고 있음
      // 'statistics' key의 value에 해당하는 딕셔너리(A-item-1-statistics)는 viewcount, likeCount를 key로 가지고 있음 
      const videoInfo = videoData.items[0];
      const { title, channelTitle, publishedAt, thumbnails, channelId } = videoInfo.snippet;
      const { viewCount, likeCount } = videoInfo.statistics;
  
      // 앞서 불러온 channelId 값을 바탕으로, youtube api를 이용해 channel 정보를 불러옴 
      // 이때 youtube api key를 발급받아 전달해야 하며, 불러온 channel 정보는 json 파일로 저장 
      const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${API_KEY}`);
      const channelData = await channelResponse.json();
  
      // channel 정보가 담긴 json 파일(A)에서, 'items' key에 해당하는 value가 있는지 확인 
      if (!channelData.items || channelData.items.length === 0) throw new Error("채널 정보를 가져올 수 없습니다.");
      
      // 'item' key에 해당하는 value 역시 리스트(A-item)이며, 해당 리스트에서 첫 번째 값을 받아오는데, 그 값이 딕셔너리(A-item-1)임
      // 이후 계속 자료 구조를 타고 내려가 채널 프로필 이미지 url을 가져옴 
      const channelProfile = channelData.items[0].snippet.thumbnails.default.url;
  
      // video 및 채널에 관해 불러온 모든 정보를 딕셔너리 형태로 return
      // 이때, getYoutubeVideoDetails를 사용한 시각도 기록 
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
        recommend: 0,
      };
    } catch (error) {
      console.error("YouTube API 오류:", error);
      return null;
    }
  };

  // e: 이벤트 객체, 이벤트 감지 
  const handleInputChange = async (e) => {
    // e.target: 이벤트가 발생한 요소, 여기서는 input 태그가 될 것 
    // e.target.value: 이벤트가 감지한 요소의 값, 여기서는 사용자가 입력한 youtube url이 될 것
    const url = e.target.value;
    
    // ...newVideo: 기존 newVideo 데이터를 복사해와 그대로 사용하되
    // video 필드만 입력받은 url로 변경해 
    // setNewVideo: newVideo 설정 , url만 바꾸면 youtube api가 나머지는 알아서 다 바꾸므로 
    setNewVideo({ ...newVideo, video: url });
  };

  // youtube url 입력 시 firebase에 저장 
  const handleAddVideo = async () => {

    if (!user || !newVideo.video) return;

    try {
      // 앞서 handleInputChange 함수에서 설정한 newVideo의 video 필드(url 값)로부터 videoId를 추출 
      const videoDetails = await getYoutubeVideoDetails(newVideo.video);

      // videoId를 추출했다면, db 경로 설정 후 
      if (!videoDetails) return;
      const userId = auth.currentUser.uid;
      const collectionPath = collection(db, "gallery"); 

      // 설정한 db 경로로 video 정보 저장. 이때 youtube api로 불러온 video 정보뿐 아니라 recommend 필드도 추가 
      await addDoc(collectionPath, {
        ...videoDetails,
        userId: userId,
        isPosted: false,
      });

      // newVideo는 다시 초기화해두기 (새로운 url 입력 받을 때까지)
      setNewVideo({ name: "", video: "", thumbnail: "", channel: "", views: "", likes: "", publishedAt: "", channelProfile: "", createdAt: serverTimestamp(), recommend: 0 });
      setFabOpen(false);
    } catch (error) {
      console.error("Firestore에 비디오 추가 중 오류 발생: ", error);
    }
  };

  // 현재 토글 값을 db에 저장 
  const handleToggleMode = async () => {
    if (!user) return;
  
    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, "users", userId); // firestore db에서 현재 유저 문서 참조 
    // isOn이 true -> 현재는 public 모드. 토글 클릭 시 private 모드로 전환되어야 하므로, newMode에는 private 저장
    // isOn이 false -> 현재는 private 모드. 토글 클릭 시 public 모드로 전환되어야 하므로, newMode에는 public 저장 
    const newMode = isOn ? "private" : "public";  
  
    try {
      // 설정한 db 경로에서, newMode 변수의 값을 Mode 필드에 저장 ("merge: true": 기존 데이터 유지)
      await setDoc(userDocRef, { Mode: newMode }, { merge: true });
      setIsOn(!isOn); // 토글 클릭 시 토글이 이동하도록 하기 위함 
    } catch (error) {
      console.error("Firestore 모드 업데이트 오류:", error);
    }
  };

  // url을 입력 받아 videoID만 추출하는 함수 (input: url)
  const getYouTubeVideoID = (url) => {

    // 괄호 안의 정규식과, url을 match (형식을 맞춰 봄)
    // 형식이 일치하면, match[1]을 사용해 \/ 사이의 값(videoID에 해당)만 반환 
    const pattern = /(?:youtu\.be\/|youtube\.com\/.*[?&]v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/user\/.*#p\/u\/\d\/|youtube\.com\/watch\?.*?v=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  };

  // videos 배열을 isOn 상태에 따라 다른 기준으로 정렬
  // 원본 videos 배열에 영향을 끼치지 않도록, [...videos]로 배열을 복사해 사용 
  const sortedVideos = [...videos].sort((a, b) => {
    if (isOn) {
      return Number(b.recommend) - Number(a.recommend); // isOn이 true이면 recommend를 기준으로 정렬, recommend가 많은 것(b)부터 정렬 
    } else {
      return new Date(b.createdAt) - new Date(a.createdAt); // isOn이 false이면 createdAt을 기준으로 정렬, createdAt이 큰 것(최신, b)부터 정렬
    }
  });

  // 현재 user의 email에서, @ 앞부분만 반환 
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
            <Image src="/deep_logo.png" alt="Logo" width={40} height={40} className="object-contain" />
          </div>
        )}

        {/* 검색 입력창 */}
        {searchMode && (
          <input
            type="text"
            className="flex-1 ml-4 px-2 py-1 text-black rounded bg-gray-100 cursor-pointer"
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
                    <Image src={video.channelProfile} alt={video.channel} width={40} height={40} className="rounded-full object-cover" />
                    

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

                      // gallery에서 video.video와 일치하는 문서 찾기
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