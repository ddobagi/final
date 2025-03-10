"use client";

// react hook
import { useEffect, useState } from "react";

// next.js 
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// firebase 
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";

// shadcn
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// lucide-react 
import { ThumbsUp, ArrowLeft, Heart } from "lucide-react";

// export default: 다른 곳에서 import 할 수 있는 함수형 컴포넌트를 정의 
export default function ReplyDetail() {

  // URL에서 firstSlug와 commentId 가져오기
  const { firstSlug, commentId } = useParams(); 

  // useRouter(): 페이지 이동을 관리하는 hook 
  const router = useRouter();

  // useState() : react에서 상태를 관리하는 hook 
  const [user, setUser] = useState(null);
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [essay, setEssay] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(1);
  const [userEmail, setUserEmail] = useState("");
  const [previousPage, setPreviousPage] = useState(`/dashboard/${firstSlug}`);

  // ✅ 하위 동적 라우팅 페이지에서는 isOn을 무조건 true로 설정
  const [isOn, setIsOn] = useState(true);

  // useEffect: 로그인한 사용자 정보 가져오기
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserEmail(currentUser.email);
        setLoading(true);
        await fetchReplyData();
      } else {
        console.log("❌ 로그인되지 않음");
        router.push("/");
        setLoading(false);
        setUserEmail("");
      }
    });

    return () => unsubscribe();
  }, [firstSlug, commentId, router]);

  // ✅ 답글 데이터 가져오기
  const fetchReplyData = async () => {
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      
      // Firestore에서 gallery/[firstSlug]/comment/[commentId] 문서 가져오기
      console.log("1번 못 찾음!");
      const docRef = doc(db, "gallery", firstSlug, "comment", commentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const replyData = docSnap.data();
        setReply(replyData);
        setEssay(replyData.essay || "");
        setLikes(replyData.recommend || 0);
      } else {
        throw new Error("해당 답글을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("Firestore에서 답글 데이터 가져오는 중 오류 발생: ", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 에세이 저장 (Firestore의 `gallery/[firstSlug]/comment/[commentId]`에 업데이트)
  const handleSaveEssay = async () => {
    if (!auth.currentUser) return;

    try {
      console.log("2번 못 찾음");
      const docRef = doc(db, "gallery", firstSlug, "comment", commentId);
      await updateDoc(docRef, { essay });

      setIsEditing(false);
    } catch (error) {
      console.error("에세이 저장 오류: ", error);
    }
  };

  // ✅ 답글 좋아요 기능
  const handleLike = async () => {
    if (!reply) return;
    if (!auth.currentUser) return;

    const docRef = doc(db, "gallery", firstSlug, "comment", commentId);

    try {
      if (liked) {
        await updateDoc(docRef, { recommend: increment(-1) });
        setLiked(false);
        setLikes((prevLikes) => prevLikes - 1);
      } else {
        await updateDoc(docRef, { recommend: increment(1) });
        setLiked(true);
        setLikes((prevLikes) => prevLikes + 1);
      }
    } catch (error) {
      console.error("좋아요 업데이트 실패:", error);
    }
  };

  if (loading) return <p className="text-center mt-10">로딩 중...</p>;
  if (error) return <p className="text-center mt-10 text-red-500">{error}</p>;

  return (
    <div className="flex flex-col items-center w-full p-6">
      <div className="w-full max-w-2xl flex justify-between">
        <button onClick={() => router.push(previousPage)} className="flex items-center mb-2">
          <ArrowLeft className="w-6 h-6 mr-2 cursor-pointer" />
        </button>
      </div>

      {reply && (
        <Card className="rounded-lg shadow-lg w-full max-w-2xl">
          <div className="relative w-full aspect-video">
            <iframe
              className="w-full h-full rounded-t-lg"
              src={reply.video}
              title={reply.name}
              frameBorder="0"
              allowFullScreen
            ></iframe>
          </div>
          <CardContent className="p-4">
            <h1 className="text-xl font-bold mb-2">{reply.name}</h1>
            <div className="flex items-center">
              <Image src={reply.channelProfile} alt="Channel Profile" width={40} height={40} className="rounded-full mr-3" />
              <span className="text-lg font-semibold">{reply.channel}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">{reply.views} views · {new Date(reply.publishedAt).toLocaleDateString()}</p>

            {/* Essay */}
            <div className="mt-4">
              <h2 className="text-lg font-semibold">Essay</h2>
              {isEditing ? (
                <textarea className="w-full p-2 border rounded mt-2" value={essay} onChange={(e) => setEssay(e.target.value)} />
              ) : (
                <p className="mt-2 p-2 border rounded bg-gray-100">{essay || "작성된 내용이 없습니다."}</p>
              )}

              <div className="flex mt-2 space-x-2 justify-end">
                {isEditing ? <Button onClick={handleSaveEssay}>저장</Button> : <Button onClick={() => setIsEditing(true)}>수정</Button>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
