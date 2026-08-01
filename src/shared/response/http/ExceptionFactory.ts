import ApiException from './ApiException'

interface InternalServerError {
   message?: string
   err?: Error
}

export class ExceptionFactory {
   // General
   static readonly internalServerError = (args?: InternalServerError): ApiException =>
      new ApiException({ status: 500, message: args?.message || 'INTERNAL SERVER ERROR', error_name: 'INTERNAL_SERVER_ERROR' }, args?.err)

   static readonly notFound = (message: string): ApiException =>
      new ApiException({ status: 404, message, error_name: 'not_found' })

   static readonly methodNotAllowed =
      new ApiException({ status: 405, message: 'Method not allowed', error_name: 'method_not_allowed' })

   static readonly invalidRequestType = (type: string): ApiException =>
      new ApiException({ status: 400, message: `The endpoint only accepts '${type}'`, error_name: 'invalid_request_type' })

   // Headers
   static readonly headerNotFound = (headerName: string): ApiException =>
      new ApiException({ status: 401, message: `Header not provided: ${headerName}`, error_name: 'header_not_found' })

   static readonly contentTypeNotSupport = (type: string): ApiException =>
      new ApiException({ status: 400, message: `Content Type not support. The endpoint only accepts '${type}'`, error_name: 'invalid_content_type' })

   static readonly invalidRequestBody =
      new ApiException({ status: 400, message: 'Invalid request body', error_name: 'invalid_request_body' })

   // Auth
   static readonly invalidCredentials = (message: string): ApiException =>
      new ApiException({ status: 400, message, error_name: 'invalid_credentials' })

   static readonly tokenNotFound = (message: string = 'Token not found'): ApiException =>
      new ApiException({ status: 401, message, error_name: 'token_not_found' })

   static readonly forbidden =
      new ApiException({ status: 403, message: '', error_name: 'forbidden' })
   static readonly unauthorized = (message: string = 'Unauthorized'): ApiException =>
      new ApiException({ status: 401, message, error_name: 'unauthorized' })

   // Access Token
   static readonly invalidAccessToken = (message: string = 'Invalid access token'): ApiException =>
      new ApiException({ status: 401, message, error_name: 'invalid_access_token' })

   static readonly expiredAccessToken = (message: string = 'Expired access token'): ApiException =>
      new ApiException({ status: 401, message, error_name: 'expired_access_token' })

   // Refresh Token
   static readonly invalidRefreshToken = (message: string = 'Invalid refresh token'): ApiException =>
      new ApiException({ status: 401, message, error_name: 'invalid_refresh_token' })

   static readonly expiredRefreshToken = (message: string = 'Expired refresh token'): ApiException =>
      new ApiException({ status: 401, message, error_name: 'expired_refresh_token' })

   static readonly tokenAlreadyUsed = (message: string = 'Token already used'): ApiException =>
      new ApiException({ status: 401, message, error_name: 'token_already_used' })

   // Params
   static readonly invalidParam = (message: string): ApiException =>
      new ApiException({ status: 400, message, error_name: 'invalid_params' })

   static readonly paramNotFound = (parameter: string): ApiException =>
      new ApiException({ status: 400, message: `${parameter} is required`, error_name: 'param_not_found' })

   // Body - FormData
   static readonly bodyNotFound =
      new ApiException({ status: 400, message: 'The body cannot be empty', error_name: 'body_not_found' })

   static readonly invalidInput = <T = any>(message: string, data?: T): ApiException =>
      new ApiException({ status: 400, message, error_name: 'invalid_input', data })

   static readonly maxUploadSizeExceeded =
      new ApiException({ status: 400, message: 'The file size exceeds the maximum allowed size', error_name: 'file_size_exceeded' })

   static readonly invalidMimetype = (message: string = 'Invalid file type'): ApiException =>
      new ApiException({ status: 400, message, error_name: 'invalid_mimetype' })

   static readonly unexpectedField = (field: string): ApiException =>
      new ApiException({ status: 400, message: `Unexpected field: ${field}`, error_name: 'unexpected_field' })

   static readonly maxFileCountExceeded = (max: number): ApiException =>
      new ApiException({ status: 400, message: `Too many files. Maximum allowed is ${max}`, error_name: 'max_file_count_exceeded' })

   // UUID
   static readonly invalidUUID =
      new ApiException({ status: 400, message: 'Invalid uuid', error_name: 'bad_uuid' })

   // User 
   static readonly OnboardingRequired = (message: string = 'User onboarding process must be completed to process this request'): ApiException =>
      new ApiException({ status: 400, message, error_name: 'onboarding_required' })
}
