
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"

type Bookmark = {
  id: string
  title: string
  url: string
  user_id: string
}

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    getUser()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) return
    fetchBookmarks()
    subscribeRealtime()
  }, [user])

  async function getUser() {
    const { data } = await supabase.auth.getUser()
    setUser(data.user)
  }

  async function fetchBookmarks() {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .order("created_at", { ascending: false })

    setBookmarks(data || [])
  }

  function subscribeRealtime() {
    supabase
      .channel("bookmarks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookmarks" },
        () => {
          fetchBookmarks()
        }
      )
      .subscribe()
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function addBookmark() {
    if (!title || !url) return

    await supabase.from("bookmarks").insert({
      title,
      url,
      user_id: user.id,
    })

    setTitle("")
    setUrl("")
  }

  async function deleteBookmark(id: string) {
    await supabase.from("bookmarks").delete().eq("id", id)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <button
          onClick={signIn}
          className="bg-black text-white px-6 py-3 rounded"
        >
          Sign in with Google
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-xl font-semibold">My Bookmarks</h1>
        <button onClick={signOut} className="text-sm underline cursor-pointer ">
          Logout
        </button>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <input
          className="border p-2 rounded"
          placeholder="Title, Heading"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="url, links, content"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={addBookmark}
          className="bg-blue-600 text-white p-2 rounded cursor-pointer "
        >
          Add Bookmark
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {bookmarks.map((b) => (
          <div
            key={b.id}
            className="bg-cyan-500 p-3 rounded shadow flex justify-between items-center"
          >
            <a href={b.url} target="_blank" className="font-medium">
              {b.title}
            </a>
            <button
              onClick={() => deleteBookmark(b.id)}
              className="text-red-500 text-sm cursor-pointer "
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
