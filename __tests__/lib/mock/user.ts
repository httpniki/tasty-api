import bcrypt from 'bcrypt'

const hashedPassword = bcrypt.hashSync('password123', 10)

export const mockUser = {
   uuid: 'test-uuid-123',
   username: 'testuser',
   email: 'test@example.com',
   name: 'Test User',
   description: 'Test description',
   avatar: '',
   header: '',
   password: 'password123',
   encrypted_password: hashedPassword,
   posts: [],
   follows: [],
   followers: [],
   birthday: '2000-01-01'
}

export const mockUserBody = {
   username: 'testuser',
   email: 'test@example.com',
   password: 'password123',
   name: 'Test User',
   birthday: '2000-01-01'
}
