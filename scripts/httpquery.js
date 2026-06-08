#!/usr/bin/env node

import { checkbox, input, select } from '@inquirer/prompts'
import pc from 'picocolors'
import { io } from 'socket.io-client'

const API = 'http://localhost:3001'

/**
*  @returns {Promise<{
*     response: Response,
*      data: any
*  }>} 
*/
async function request(method, path, opts = {}) {
   const headers = { ...opts.headers }

   if (headers['Content-Type'] === undefined && !(opts.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
   }

   const start = Date.now()

   const res = await fetch(path, {
      method,
      headers,
      body: opts.body,
      ...opts.fetchOpts
   })

   const end = Date.now()

   const data = await res.json()
      .then(data => data)
      .catch(() => null)

   console.log('')
   console.log(`* HTTP CODE: ${res.status}`)
   console.log(`* TIME: ${end - start}ms`)
   if (data) console.log(JSON.stringify(data, null, 2))
   console.log('')

   return {
      response: res,
      data
   }
}

// --- MAIN ---
async function mainMenu() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- HTTP QUERY -----\n')))

   const main = await select({
      message: 'Select',
      choices: [
         { name: 'Auth', value: '1' },
         { name: 'User', value: '2' },
         { name: 'Posts', value: '3' },
         { name: 'Messages', value: '4' },
         { name: 'Exit', value: '5' }
      ]
   })

   switch (main) {
      case '1': await authMenu(); break
      case '2': await userMenu(); break
      case '3': await postMenu(); break
      case '4': await messageMenu(); break
      case '5':
      case 'exit':
         console.log(pc.bold(pc.red('Exiting...')))
         return
   }
}

async function authMenu() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- AUTH MENU -----\n')))

   const opt = await select({
      message: 'Select',
      choices: [
         { name: 'Login', value: '1' },
         { name: 'Refresh token', value: '2' },
         { name: 'Exit', value: '3' }
      ]
   })

   switch (opt) {
      case '1': await login(); break
      case '2': await refreshToken(); break
      case '3':
         console.log(pc.bold(pc.red('Exiting...')))
         return
   }
}

async function userMenu() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- USER MENU -----\n')))

   const opt = await select({
      message: 'Select an option',
      choices: [
         { name: 'Register', value: '1' },
         { name: 'Get user profile', value: '2' },
         { name: 'Check Availability', value: '3' },
         { name: 'Follow', value: '4' },
         { name: 'Unfollow', value: '5' },
         { name: 'Update Profile', value: '6' },
         { name: 'Search Users', value: '7' },
         { name: 'Exit', value: '8' }
      ]
   })

   switch (opt) {
      case '1': await register(); break
      case '2': await getUserProfile(); break
      case '3': await checkAvailability(); break
      case '4': await follow(); break
      case '5': await unfollow(); break
      case '6': await updateProfile(); break
      case '7': await searchUsers(); break
      case '8': return
   }
}

async function postMenu() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- POST MENU -----\n')))

   const opt = await select({
      message: 'Select an option',
      choices: [
         { name: 'Get Posts', value: '1' },
         { name: 'Get Post', value: '2' },
         { name: 'Create Post', value: '3' },
         { name: 'Repost', value: '4' },
         { name: 'Delete Repost', value: '5' },
         { name: 'Delete Post', value: '6' },
         { name: 'Exit', value: '7' }
      ]
   })

   switch (opt) {
      case '1': await getPosts(); break
      case '2': await getPost(); break
      case '3': await createPost(); break
      case '4': await repostPost(); break
      case '5': await deleteRepostPost(); break
      case '6': await deletePost(); break
      case '7': return
   }
}

async function messageMenu() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- MESSAGE MENU -----\n')))

   const token = await login()

   const socket = io(`${API}/chat`, {
      auth: { token: token.data.access_token }
   })

   socket.on('connect', () => console.log('\n', pc.green('Socket connected'), '\n'))
   socket.on('connect_error', (err) => console.log('\n', pc.red('Socket error:'), err.message, '\n'))
   socket.on('message:receive', (data) => console.log('\n📩 Received:', JSON.stringify(data, null, 2), '\n'))
   socket.on('message:updated', (data) => console.log('\n🔄 Updated:', JSON.stringify(data, null, 2), '\n'))
   socket.on('error', (data) => console.log(pc.red('\n⚠️  Error:'), JSON.stringify(data, null, 2), '\n'))
   socket.on('disconnect', () => console.log('\n', pc.red('Socket disconnected'), '\n'))

   while (true) {
      console.log(pc.bold(pc.magenta('----- MESSAGE MENU -----\n')))

      const opt = await select({
         message: 'Select',
         choices: [
            { name: 'Get chats', value: '1' },
            { name: 'Get chat', value: '2' },
            { name: 'Send message', value: '3' },
            { name: 'Read message', value: '4' },
            { name: 'Delete message', value: '5' },
            { name: 'Exit', value: '6' }
         ]
      })

      switch (opt) {
         case '1': await getChats(); break
         case '2': await getChat(); break
         case '3': await sendMessage(socket); break
         case '4': await readMessage(socket); break
         case '5': await deleteMessage(socket); break
         case '6':
            socket.close()
            console.log(pc.bold(pc.red('Exiting...')))
            return
      }
   }
}

mainMenu()

// ----- AUTHENTICATION -----
/**
* @returns {Promise<{ 
*     response: Response,
*     data: { 
*       access_token: string, 
*       refresh_token: string 
*     } 
*  }>}
*/
async function login() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- Login -----\n')))

   const user_select = await select({
      message: 'Select',
      choices: [
         { name: 'Example', value: '1' },
         { name: 'John Doe', value: '2' },
         { name: 'Other', value: '3' },
         { name: 'Exit', value: '4' }
      ]
   })

   let email; let password

   switch (user_select) {
      case '1':
         email = await input({ message: 'Email: ', prefill: 'editable', default: 'example@example.com' })
         password = await input({ message: 'Password: ', prefill: 'editable', default: 'example123' })
         break
      case '2':
         email = await input({ message: 'Email: ', prefill: 'editable', default: 'john@doe.com' })
         password = await input({ message: 'Password: ', prefill: 'editable', default: 'john1234' })
         break
      case '3':
         email = await input({ message: 'Email: ' })
         password = await input({ message: 'Password: ' })
         break
      case '4':
         console.log(pc.bold(pc.red('Exiting...')))
         return
   }

   const data = await request('POST', `${API}/auth/token?grant_type=password`, { body: JSON.stringify({ email, password }) })

   return {
      response: data.response,
      data: {
         access_token: data.data.access_token,
         refresh_token: data.data.refresh_token
      }
   }
}

async function refreshToken() {
   console.clear()
   const loginData = await login()

   console.log(pc.bold(pc.magenta('----- Refresh Token -----\n')))

   await request('POST', `${API}/auth/token?grant_type=refresh_token`, {
      body: JSON.stringify({ refresh_token: loginData.data.refresh_token })
   })
}

// ----- USER -----
async function register() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- User Registration -----\n')))

   const username = await input({ message: 'Username:' })
   const password = await input({ message: 'Password:' })
   const name = await input({ message: 'Name:' })
   const email = await input({ message: 'Email:' })
   const birthday = await input({ message: 'Birthday (YYYY-MM-DD):' })

   const formdata = new FormData()
   formdata.append('username', username)
   formdata.append('password', password)
   formdata.append('name', name)
   formdata.append('email', email)
   formdata.append('birthday', birthday)

   await request('POST', `${API}/user/register`, {
      body: formdata
   })
}

async function getUserProfile() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Get user profile -----\n')))

   const username = await select({
      message: 'Select a user:',
      choices: [
         { name: 'example', value: 'example' },
         { name: 'johndoe10', value: 'johndoe10' },
         { name: 'Custom...', value: '__custom__' }
      ]
   })

   const finalUsername = username === '__custom__'
      ? await input({ message: 'Username:' })
      : username

   await request('GET', `${API}/user/${finalUsername}`, {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

async function checkAvailability() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- Check availability -----\n')))

   const field = await select({
      message: 'Field:',
      choices: [
         { name: 'Username', value: 'username' },
         { name: 'Email', value: 'email' }
      ]
   })
   const value = await input({ message: 'Value:' })

   await request('POST', `${API}/user/check-availability`, {
      body: JSON.stringify({ field, value })
   })
}

async function follow() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Follow -----\n')))

   const username = await input({ message: 'Username:' })

   await request('POST', `${API}/user/${username}/follow`, {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

async function unfollow() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Unfollow -----\n')))

   const username = await input({ message: 'Username:' })

   await request('POST', `${API}/user/${username}/unfollow`, {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

async function updateProfile() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Update profile -----\n')))

   const fields = await checkbox({
      message: 'Select fields to update:',
      choices: [
         { name: 'Name', value: 'name' },
         { name: 'Username', value: 'username' },
         { name: 'Description', value: 'description' }
      ]
   })

   const body = new FormData()
   if (fields.includes('name')) body.append('name', await input({ message: 'Name:' }))
   if (fields.includes('username')) body.append('username', await input({ message: 'Username:' }))
   if (fields.includes('description')) body.append('description', await input({ message: 'Description:' }))

   await request('PUT', `${API}/user/profile`, {
      body: body,
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

async function searchUsers() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- Search users -----\n')))

   const shouldLogin = await select({
      message: 'Login?',
      choices: [
         { name: 'Yes', value: true },
         { name: 'No', value: false }
      ]
   })

   let token = null
   if (shouldLogin) token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Search users -----\n')))

   const query = await input({ message: 'Query:', default: 'john' })

   await request('GET', `${API}/user/search?q=${query}&limit=10&page=1`, {
      headers: token ? { Authorization: `Bearer ${token.data.access_token}` } : {}
   })
}

// ----- POSTS -----
async function getPosts() {
   const shouldLogin = await select({
      message: 'Login?',
      choices: [
         { name: 'Yes', value: true },
         { name: 'No', value: false }
      ]
   })

   let token = null
   let user
   let headers = undefined
   let path = new URL(`${API}/posts`)

   if (shouldLogin) {
      token = await login()
      path.searchParams.append('follows', 'true')
      headers = {
         Authorization: `Bearer ${token.data.access_token}`,
         'Content-Type': 'application/json'
      }
   }

   console.clear()
   console.log(pc.bold(pc.magenta('----- Get Posts -----\n')))

   if (!shouldLogin) {
      user = await input({ message: 'User UUID (optional):' })
      if (user) path.searchParams.append('user', user)
   }

   const page = await input({ message: 'Page:', default: '1' })

   if (page < 1) {
      console.log(pc.red('Page must be greater than 0'))
      return
   }

   const limit = await input({ message: 'Limit:', default: '20' })

   if (limit < 1) {
      console.log(pc.red('Limit must be greater than 0'))
      return
   }

   path.searchParams.append('page', page)
   path.searchParams.append('limit', limit)
   await request('GET', path.toString(), { headers })
}

async function getPost() {
   console.clear()
   console.log(pc.bold(pc.magenta('----- Get Post -----\n')))

   const postUuid = await input({ message: 'Post UUID:' })

   await request('GET', `${API}/posts/${postUuid}`)
}

async function createPost() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Create Post -----\n')))

   const content = await input({ message: 'Content:' })

   await request('POST', `${API}/posts`, {
      body: JSON.stringify({ content }),
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

async function repostPost() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Repost Post -----\n')))

   const postUuid = await input({ message: 'Post UUID:' })

   await request('POST', `${API}/posts/repost/${postUuid}`, {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

async function deleteRepostPost() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Delete Repost -----\n')))

   const postUuid = await input({ message: 'Post UUID:' })

   await request('DELETE', `${API}/posts/repost/${postUuid}`, {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

async function deletePost() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Delete Post -----\n')))

   const postUuid = await input({ message: 'Post UUID:' })

   await request('DELETE', `${API}/posts/${postUuid}`, {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

// ----- MESSAGE -----
async function sendMessage(socket) {
   const recipient = await select({
      message: 'Recipient:',
      choices: [
         { name: 'Example', value: 'example' },
         { name: 'John Doe', value: 'johndoe' },
         { name: 'Custom...', value: '__custom__' }
      ]
   })

   let to

   switch (recipient) {
      case 'example':
         to = await input({ message: 'Target UUID:', prefill: 'editable', default: '20383fda-a374-46b2-a527-cb4b100a8f46' })
         break
      case 'johndoe':
         to = await input({ message: 'Target UUID:', prefill: 'editable', default: 'c7c670bc-1a2f-44ee-953c-8c721ebc37fd' })
         break
      case '__custom__':
         to = await input({ message: 'Target UUID:', prefill: 'editable', default: '' })
         break
   }

   const message = await input({ message: 'Message:' })
   socket.emit('message:send', { to, message })
}

async function readMessage(socket) {
   const messageUuid = await input({ message: 'Message UUID:' })

   socket.emit('message:read', { message_uuid: messageUuid })
}

async function deleteMessage(socket) {
   const chatUuid = await input({ message: 'Chat UUID:' })
   const messageUuid = await input({ message: 'Message UUID:' })

   socket.emit('message:delete', { chat_uuid: chatUuid, message_uuid: messageUuid })
}

async function getChats() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Get Chats -----\n')))

   const page = await input({ message: 'Page:', default: '1' })
   const limit = await input({ message: 'Limit:', default: '5' })

   await request('GET', `${API}/chats?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

async function getChat() {
   const token = await login()

   console.clear()
   console.log(pc.bold(pc.magenta('----- Get Chat -----\n')))

   const chatUuid = await input({ message: 'Chat UUID:' })
   const page = await input({ message: 'Page:', default: '1' })
   const limit = await input({ message: 'Limit:', default: '20' })

   await request('GET', `${API}/chats/${chatUuid}?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
   })
}

