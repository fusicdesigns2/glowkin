
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: { url: string }[]
}

export const useSpotifyAuth = () => {
  const { user } = useAuth()
  const [spotifyUser, setSpotifyUser] = useState<SpotifyUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasValidToken, setHasValidToken] = useState(false)

  useEffect(() => {
    if (user) {
      checkSpotifyToken()
    }
  }, [user])

  const checkSpotifyToken = async () => {
    try {
      const { data } = await supabase
        .from('spotify_tokens')
        .select('expires_at')
        .eq('user_id', user?.id)
        .single()

      if (data && new Date(data.expires_at) > new Date()) {
        setHasValidToken(true)
        await fetchSpotifyUser()
      } else {
        setHasValidToken(false)
        setSpotifyUser(null)
      }
    } catch (error) {
      setHasValidToken(false)
      setSpotifyUser(null)
    }
  }

  const fetchSpotifyUser = async () => {
    try {
      const { data: tokenData } = await supabase
        .from('spotify_tokens')
        .select('access_token')
        .eq('user_id', user?.id)
        .single()

      if (tokenData) {
        const response = await fetch('https://api.spotify.com/v1/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        })

        if (response.ok) {
          const userData = await response.json()
          setSpotifyUser(userData)
        }
      }
    } catch (error) {
      console.error('Error fetching Spotify user:', error)
    }
  }

  const initiateSpotifyAuth = async () => {
    setIsLoading(true)
    try {
      const response = await supabase.functions.invoke('spotify-oauth', {
        body: { action: 'get_auth_url' }
      })

      if (response.data?.success) {
        window.location.href = response.data.authUrl
      } else {
        throw new Error('Failed to get Spotify auth URL')
      }
    } catch (error) {
      console.error('Error initiating Spotify auth:', error)
      toast.error('Failed to connect to Spotify')
      setIsLoading(false)
    }
  }

  const handleSpotifyCallback = async (code: string) => {
    setIsLoading(true)
    try {
      const response = await supabase.functions.invoke('spotify-oauth', {
        body: { action: 'exchange_code', code }
      })

      if (response.data?.success) {
        setSpotifyUser(response.data.user)
        setHasValidToken(true)
        toast.success('Successfully connected to Spotify!')
        return true
      } else {
        throw new Error(response.data?.error || 'Failed to exchange code')
      }
    } catch (error) {
      console.error('Error handling Spotify callback:', error)
      toast.error('Failed to complete Spotify authentication')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectSpotify = async () => {
    try {
      await supabase
        .from('spotify_tokens')
        .delete()
        .eq('user_id', user?.id)

      setSpotifyUser(null)
      setHasValidToken(false)
      toast.success('Disconnected from Spotify')
    } catch (error) {
      console.error('Error disconnecting Spotify:', error)
      toast.error('Failed to disconnect from Spotify')
    }
  }

  return {
    spotifyUser,
    hasValidToken,
    isLoading,
    initiateSpotifyAuth,
    handleSpotifyCallback,
    disconnectSpotify,
    checkSpotifyToken
  }
}
