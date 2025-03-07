// useState, useEffect 등 react hook은 클라이언트 사이드에서만 실행되므로, 클라이언트 컴포넌트임을 선언하는 것 
"use client";

// react 
import { useState, useEffect } from "react";

// next.js 
import { useRouter } from "next/navigation";
import Link from "next/link";

// firebase 
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { query, collection, getDocs, onSnapshot, doc, where, setDoc } from "firebase/firestore";

// shadcn 
import { Card, CardContent } from "@/components/ui/card";

// lucide-react
import { ArrowLeft } from "lucide-react";

// export default: 다른 곳에서 import 할 수 있게 함 
// 다른 곳에서 import 할 수 있는 함수형 컴포넌트를 정의 
export default function LikesDashboard() {

  // useState() : react에서 상태를 관리하는 hook 
  // state 정보와 setter 함수가 배열[]로 정의됨 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [userEmail, setUserEmail] = useState("");

  // useRouter(): 페이지 이동을 관리하는 hook 
  const router = useRouter();
  
  // useEffect: 컴포넌트가 렌더링될 때 실행되는 react hook 
  useEffect(() => {
    const updateUserMode = async () => {
      if (!auth.currentUser) return;

      // 현재 user의 문서를 참조하기 위한 db 경로 설정 
      const userId = auth.currentUser.uid;
      const userDocRef = doc(db, "users", userId);

      try {
        // user가 public 모드에서 좋아요를 누른 영상들이 likes 페이지에 표시되는 것
        // 따라서, likes 페이지 접속 시, public 모드로 자동 변경
        // 현재 user 문서 Mode 필드의 값을 public으로 설정 ("merge: true": 기존 데이터 유지))
        await setDoc(userDocRef, { Mode: "public" }, { merge: true }); 
        console.log("🔥 Mode 값이 'public'으로 설정되었습니다!!!");
      } catch (error) {
        console.error("Firestore 모드 업데이트 오류:", error);
      }
    };

    updateUserMode(); // useEffect 실행 시 앞서 정의한 updateUserMode() 실행 

  // 의존성 배열이 비어있음 -> 컴포넌트가 최초 렌더링(마운트) 될 때 한 번만 실행되고, 이후 실행되지 않음
  }, []);

  // useEffect: 컴포넌트가 렌더링될 때 실행되는 react hook 
  useEffect(() => {

    // onAuthStateChanged(auth, callback): 사용자의 로그인 상태 변경을 감지하는 firebase authentication의 이벤트 리스너 
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {

      // 현재 사용자와 현재 사용자의 이메일을, 각각 user와 userEmail로 설정 
      if (currentUser) {
        setUser(currentUser);
        setUserEmail(currentUser.email);
      } else {
        router.push("/");
        setUserEmail("")
      }
      setLoading(false);
    });

    // 정의한 unsubscribe 함수를 return + 이벤트 리스너 해제 
    return () => unsubscribe();

  // 의존성 배열에 router 포함 -> router 값이 변경될 때마다 실행 
  }, [router]);

  // useEffect: 컴포넌트가 렌더링될 때 실행되는 react hook 
  useEffect(() => {

    if (!auth.currentUser) return;
  
    const userId = auth.currentUser.uid;
    const galleryRef = collection(db, "gallery");
  
    // onSnapshot: firebase 문서가 변경되었음을 감지하는 이벤트 리스너 
    // snapshot: galleryRef 경로의 모든 문서 
    const checkLike = onSnapshot(galleryRef, async (snapshot) => {

      // likedVideoIds를 빈 배열로 정의 
      const likedVideoIds = [];
  
      // snapshot의 docs들에 대해 반복 실행 
      for (const doc of snapshot.docs) {
        const likesRef = collection(db, "gallery", doc.id, "likes"); // gallery 컬렉션의 likes db에서, 
        const likeQuery = query(likesRef, where("__name__", "==", userId)); // 문서 제목이, 현재 user의 id와 일치하는 문서만 query 
        const likeSnapshot = await getDocs(likeQuery); // query된 문서를 가져옴 
  
        // likedVideoIds 배열에 query 결과 얻어진 doc.id(= videoId)들을 추가 
        if (!likeSnapshot.empty) {
          likedVideoIds.push(doc.id);
        }
      }
  
      // snapshot의 docs들을 likedVideos 객체에 담되, 
      const likedVideos = snapshot.docs
        // likedVideoIds 배열에 포함된 doc.id를 가지는 문서들만  
        .filter((doc) => likedVideoIds.includes(doc.id))
        // .map(): 딕셔너리로 변환  
        .map((doc) => ({ id: doc.id, ...doc.data() }));
  
      // videos 상태 변수에 얻어진 likedVideos 딕셔너리를 저장 
      setVideos(likedVideos);
    });
  
    // onSnapshot 이벤트 리스너 해제, checkLike 함수 return 
    return () => checkLike();
  
  // 의존성 배열에 user 포함 -> 로그인한 user가 변경될 때마다 실행
  }, [user]);

  // 현재 user의 email에서, @ 앞부분만 반환 
  function getEmailUsername(email) {
    if (!email || typeof email !== "string") return "";
    return email.split("@")[0];
  }

  // url을 입력 받아 videoID만 추출하는 함수 (input: url)
  const getYouTubeVideoID = (url) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/.*v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/.*#p\/u\/\d\/|youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^#&?\n]+)/);
    return match ? match[1] : null;
  };
  
  if (loading) return <p>Loading...</p>;

  return (
    <div className="rounded-lg shadow-lg max-w-2xl w-full flex flex-col p-6 relative mx-auto">
      <div className="w-full max-w-2xl flex justify-between">
        <Link href="/dashboard" className="flex items-center mb-2">
          <ArrowLeft className="w-6 h-6 mr-2" />
        </Link>
        <div className="flex items-center max-w-[600px] w-full h-10 space-x-2 justify-end">
          <p className="text-gray-500 text-sm font-pretendard">{getEmailUsername(userEmail)} 님</p>
          <p onClick={() => signOut(auth)} className="cursor-pointer text-gray-500 text-sm font-pretendard underline">로그아웃</p>
        </div>
      </div>      

      <div className="grid grid-cols-1 gap-6 mt-0 w-full max-w-6xl">
        {videos.map((video) => (
          <Card key={video.id} className="w-full max-w-[600px] rounded-lg shadow-lg cursor-pointer hover:shadow-2xl transition relative">
            <Link href={`/dashboard/${video.id}`} passHref>
              <div className="relative w-full aspect-video">
                <iframe
                  className="w-full h-full rounded-t-lg"
                  src={`https://www.youtube.com/embed/${getYouTubeVideoID(video.video)}?autoplay=0&controls=1`}
                  title={video.name}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </Link>
            <CardContent className="p-4">
              <Link href={`/dashboard/${video.id}`} passHref>
                <div className="flex items-center space-x-3">
                  <img src={video.channelProfile} alt={video.channel} className="w-10 h-10 rounded-full object-cover" />
                  <div className="flex flex-col flex-1">
                    <h3 className="text-lg font-bold mb-2">{video.name}</h3>
                    <p className="text-sm text-gray-500">{video.channel} · {video.views} views · {new Date(video.publishedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}