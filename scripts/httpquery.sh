#!/bin/bash

show_details() {
   body=$(echo "$RESPONSE" | sed -n '1p')
   http_code=$(echo "$RESPONSE" | sed -n '2p')
   time_total=$(echo "$RESPONSE" | sed -n '3p')                              
   download_size=$(echo "$RESPONSE" | sed -n '4p' | awk '{printf $1 / 1024}')

   echo ""
   echo $body | jq
   echo ""
   echo "* HTTP CODE: $http_code"
   echo "* TIME TOTAL: ${time_total}s"
   echo "* RESPONSE SIZE: ${download_size}kbs"
   echo ""

   echo "Done."
}

## --- USER MENU ---
register() {
   clear

   echo "--- User Registration ---"

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X POST "http://localhost:3001/user/register" \
      -F "username=johndoe10" \
      -F "password=john1234" \
      -F "name=John" \
      -F "email=john@doe.com" \
      -F "birthday=2001-02-16" \
      -F "avatar=@${HOME}/Imágenes/cropped_profile.jpg" \
      -F "header=@${HOME}/Imágenes/cropped_profile.jpg")

   show_details
}

get_user_profile() {
   clear

   echo "--- Get User Profile ---"

   read -e -p "Enter the username: " -i "johndoe10" USERNAME

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X GET "http://localhost:3001/user/$USERNAME" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

   show_details
}

check_availability() {
   clear

   echo "--- Check Availability ---"

   read -p "Field (username or email): " field
   read -p "Value: " value

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X POST "http://localhost:3001/user/check-availability" \
      -H "Content-Type: application/json" \
      -d "{ \"field\": \"$field\", \"value\": \"$value\" }")

   show_details
}

follow() {
   clear

   echo "--- Follow User ---"

   if [[ -z "$ACCESS_TOKEN" ]]; then
      echo "Access token is missing"
      exit 1
   fi

   read -p "Enter the username: " username

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X POST "http://localhost:3001/user/$username/follow" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

   show_details
}

unfollow() {
   clear

   echo "--- Unfollow User ---"

   if [[ -z "$ACCESS_TOKEN" ]]; then
      echo "Access token is missing"
      exit 1
   fi

   read -p "Enter the username: " username

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X POST "http://localhost:3001/user/$username/unfollow" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

   show_details
}

update_profile() {
   clear

   echo "--- Update Profile ---"

   if [[ -z "$ACCESS_TOKEN" ]]; then
      echo "Access token is missing"
      exit 1
   fi

   read -e -p "Name: (-1 to skip) " -i "jhondoe10" name
   read -e -p "Name: (-1 to skip) " -i "John Doe" name
   read -e -p "Description: (-1 to skip) " -i "This is a updated description" description
   read -e -p "Avatar path: (-1 to skip or true/false to delete) " -i "/home/nicolas/Imágenes/cropped_profile.jpg" avatar
   read -e -p "Header path: (-1 to skip or true/false to delete) " -i "/home/nicolas/Imágenes/cropped_profile.jpg" header

   declare -a BODY

   if [ "$name" != "-1" ]; then
      BODY+=("-F" "name=$name")
   fi

   if [ "$description" != "-1" ]; then
      BODY+=("-F" "description=$description")
   fi

   if [ "$username" != "-1" ]; then
      BODY+=("-F" "username=$username")
   fi

   case "$avatar" in
      "-1")
      ;;
      "true")
         BODY+=("-F" "delete_avatar=true")
      ;;
      "false")
         BODY+=("-F" "delete_avatar=false")
      ;;
      *)
         BODY+=("-F" "avatar=@$avatar")
      ;;
   esac

   case "$header" in
      "-1")
      ;;
      "true")
         BODY+=("-F" "delete_header=true")
      ;;
      "false")
         BODY+=("-F" "delete_header=false")
      ;;
      *)
         BODY+=("-F" "header=@$header")
      ;;
   esac

   echo "Form: ${BODY[@]}"

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X PUT "http://localhost:3001/user/profile" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      "${BODY[@]}")
   
   show_details
}

search_users() {
   clear
   echo "--- Search Users ---"

   declare -a REQUEST_HEADERS

   REQUEST_HEADERS+=("-H" "Content-Type: application/json")

   if [[ -z "$ACCESS_TOKEN" ]]; then
      echo "Access token is missing"
   else
      REQUEST_HEADERS+=("-H" "Authorization: Bearer $ACCESS_TOKEN")
   fi

   read -e -p "Query: " -i "john" query

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X GET "http://localhost:3001/user/search?q=$query&limit=10&page=1" \
   "${REQUEST_HEADERS[@]}")

   show_details
}

user_menu() {
   clear
   echo "--- USER MENU ---"

   opts=("Register" "Get User Profile" "Check Availability" "Follow" "Unfollow" "Update Profile" "Search Users" "Exit")
   
   select opt in "${opts[@]}"
   do
      case $opt in
         "Register")
            register
            exit 0
            ;;
            "Get User Profile")
            login
            get_user_profile
            exit 0
            ;;
         "Check Availability")
            check_availability
            exit 0
            ;;
         "Follow")
            login
            follow
            exit 0
            ;;
         "Unfollow")
            login
            unfollow
            exit 0
            ;;
            "Update Profile")
            login
            update_profile
            exit 0
            ;;
            "Search Users")
            read -e -p "Login: (y/n) " -i "y" l
            if [[ $l == "y" ]]; then
               login
            fi

            search_users
            exit 0
            ;;
         "Exit")
            echo "Exit"
            exit 0
            ;;
         *) echo "invalid option $REPLY";;
      esac
   done
}

# --- AUTH MENU ---
login() {
   clear
   echo "--- Login ---"
   
   read -e -p "Email: " -i "john@doe.com" email
   read -e -p "Password: " -i "john1234" password

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X POST "http://localhost:3001/auth/token?grant_type=password" \
      -H "Content-Type: application/json" \
      -d "{ \"email\": \"$email\", \"password\": \"$password\" }")
 
   ACCESS_TOKEN=$(echo "$RESPONSE" | sed -n '1p' |  jq -r '.access_token')
   REFRESH_TOKEN=$(echo "$RESPONSE" | sed -n '1p' |  jq -r '.refresh_token')

   show_details
}

refresh_token() {
   clear

   echo "--- Refresh Token ---"
   
   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X POST "http://localhost:3001/auth/token?grant_type=refresh_token" \
      -H "Content-Type: application/json" \
      -d "{ \"refresh_token\": \"$REFRESH_TOKEN\" }")

   show_details
}

auth_menu() {
   clear
   echo "--- AUTH MENU ---"

   opts=("Login" "Refresh token" "Exit")

   select opt in "${opts[@]}"
      do
         case $opt in
            "Login")
               login
               exit 0
               ;;
               "Refresh token")
               login
               refresh_token
               exit 0
               ;;
            "Exit")
               echo "Exit"
               exit 0
               ;;
            *) echo "invalid option $REPLY";;
         esac
      done
}

create_post() {
   clear
   echo "--- Create Post ---"

   read -e -p "Content: " -i "This is a example post" content

   if [ -z $ACCESS_TOKEN ]; then
      echo "Access token is missing"
      exit 1
   fi

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X POST "http://localhost:3001/posts" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -d "{ \"content\": \"$content\" }")

   show_details
   POST_UUID=$(echo "$RESPONSE" | sed -n '1p' |  jq -r '.uuid')
}

get_posts() {
   clear
   echo "--- Get Post ---"
   
   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X GET "http://localhost:3001/posts" \
      -H "Content-Type: application/json"
   )
   
   show_details
   JSON_BODY=$(echo "$RESPONSE" | head -n 1)
   POST_UUID=$(echo "$JSON_BODY" | jq -r '.data[0].uuid')
}

get_post() {
   clear
   echo "--- Get Post ---"
   
   read -e -p "Enter the post uuid: " -i "$POST_UUID" POST_UUID

   if [[ -z "$POST_UUID" ]]; then
      echo "Post uuid is missing"
      exit 1
   fi

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X GET "http://localhost:3001/posts/$POST_UUID" \
      -H "Content-Type: application/json"
   )
   
   show_details
}

delete_post() {
   if [[ -z "$ACCESS_TOKEN" ]]; then
      echo "Access token is missing"
      exit 1
   fi

   # TODO: this has to execute the get_user_posts

   if [[ -z "$POST_UUID" ]]; then
      echo "Post uuid is missing"
      exit 1
   fi

   clear
   echo "--- DELETE POST ---"
   read -e -p "Enter the post uuid: " -i "$POST_UUID" POST_UUID

   RESPONSE=$(curl -s -w "\n%{http_code} \n%{time_total} \n%{size_download}" \
      -X DELETE "http://localhost:3001/posts/$POST_UUID" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN"
   )

   show_details
}

post_menu() {
   clear
   echo "--- POST MENU ---"

   opts=("Get Post" "Get Posts" "Create Post" "Delete Post" "Exit")

   select opt in "${opts[@]}"
      do
         case $opt in
            "Get Posts")
               login
               create_post
               get_posts
               exit 0
               ;;
               "Get Post")
               get_post
               exit 0
               ;;
            "Create Post")
               login
               create_post
               exit 0
               ;;
            "Delete Post")
               login
               create_post
               refresh_token
               delete_post
               exit 0
               ;;
            "Exit")
               echo "Exit"
               exit 0
               ;;
            *) echo "invalid option $REPLY";;
         esac
      done
}

# --- MAIN MENU ---
clear

PS3="Select an category (or 3 for exit) "
echo "--- MAIN MENU ---"

main_options=("Auth" "User" "Posts" "Exit")

select main_opt in "${main_options[@]}"
do
   case $main_opt in
      "Auth")
         auth_menu
         ;;
      "User")
         user_menu
         ;;
      "Posts")
         post_menu
         ;;
      "Exit")
         echo "Exit"
         exit 0
         ;;
      *) echo "invalid option $REPLY";;
   esac
done
