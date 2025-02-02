from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import psycopg2
from datetime import datetime
import bcrypt
import traceback
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import os
import time

app = Flask(__name__)

# CORS ayarlarını güncelle
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Origin"],
        "supports_credentials": True
    }
})

# Veritabanı bağlantısı
try:
    load_dotenv()
    conn = psycopg2.connect(
    database=os.getenv("DATABASE_NAME"),
    user=os.getenv("DATABASE_USER"),
    password=os.getenv("DATABASE_PASSWORD"),
    host=os.getenv("DATABASE_HOST"),
    port=os.getenv("DATABASE_PORT")
)
    conn.autocommit = True
    cursor = conn.cursor()
except Exception as e:
    print("Database connection error:", str(e))

# Hata yakalama decorator'ı
def error_handler(f):
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Error in {f.__name__}:", str(e))
            traceback.print_exc()
            return jsonify({
                "success": False,
                "message": str(e)
            }), 500
    wrapper.__name__ = f.__name__
    return wrapper

# Profil resmi yükleme için konfigürasyon
UPLOAD_FOLDER = 'uploads/profile_pictures'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Tweet resimlerinin yükleneceği klasörü tanımla
TWEET_UPLOAD_FOLDER = 'uploads/tweet_images'
if not os.path.exists(TWEET_UPLOAD_FOLDER):
    os.makedirs(TWEET_UPLOAD_FOLDER)

# 1. Belirli bir kullanıcının tweetlerini listele
@app.route('/user_tweets/<int:user_id>', methods=['GET'])
def get_user_tweets(user_id):
    try:
        current_user_id = request.args.get('current_user_id', user_id, type=int)
        cursor.execute('''
            WITH tweet_stats AS (
                SELECT 
                    t."TweetID",
                    COUNT(DISTINCT l."UserID") as likes,
                    COUNT(DISTINCT c."CommentID") as comments,
                    COUNT(DISTINCT rt."TweetID") as retweets
                FROM "Tweets" t
                LEFT JOIN "Likes" l ON t."TweetID" = l."TweetID"
                LEFT JOIN "Comments" c ON t."TweetID" = c."TweetID"
                LEFT JOIN "Tweets" rt ON t."TweetID" = rt."RetweetID"
                GROUP BY t."TweetID"
            )
        SELECT 
            t."TweetID", 
            t."Content", 
            t."Timestamp", 
                t."ImageURL",
            u."FirstName", 
            u."LastName",
                u."Username",
                u."ProfilePicture",
                t."UserID",
                COALESCE(ts.likes, 0) as likes,
                COALESCE(ts.comments, 0) as comments,
                COALESCE(ts.retweets, 0) as retweet_count,
                t."RetweetID",
                ou."UserID" as original_user_id,
                ou."FirstName" as original_first_name,
                ou."LastName" as original_last_name,
                ou."Username" as original_username,
                ou."ProfilePicture" as original_profile_picture,
                ot."Content" as original_content,
                EXISTS(
                    SELECT 1 FROM "Likes" 
                    WHERE "TweetID" = t."TweetID" AND "UserID" = %s
                ) as user_liked,
                EXISTS(
                    SELECT 1 FROM "Tweets" rt 
                    WHERE rt."RetweetID" = t."TweetID" AND rt."UserID" = %s
                ) as is_retweeted
        FROM "Tweets" t
        JOIN "Users" u ON t."UserID" = u."UserID"
            LEFT JOIN tweet_stats ts ON t."TweetID" = ts."TweetID"
            LEFT JOIN "Tweets" ot ON t."RetweetID" = ot."TweetID"
            LEFT JOIN "Users" ou ON ot."UserID" = ou."UserID"
            WHERE t."UserID" = %s AND (t."RetweetID" IS NULL OR t."UserID" = %s)
            ORDER BY t."Timestamp" DESC
        ''', (current_user_id, current_user_id, user_id, user_id))
        
        tweets = cursor.fetchall()
        formatted_tweets = [{
            "tweet_id": tweet[0],
            "content": tweet[1],
            "timestamp": tweet[2].strftime('%Y-%m-%d %H:%M:%S'),
            "image_url": tweet[3],
            "first_name": tweet[4],
            "last_name": tweet[5],
            "username": tweet[6],
            "profile_picture": tweet[7],
            "user_id": tweet[8],
            "likes": tweet[9],
            "comments": tweet[10],
            "retweet_count": tweet[11],
            "is_retweet": tweet[12] is not None,
            "RetweetID": tweet[12],
            "original_user_id": tweet[13],
            "original_first_name": tweet[14],
            "original_last_name": tweet[15],
            "original_username": tweet[16],
            "original_profile_picture": tweet[17],
            "original_content": tweet[18],
            "user_liked": tweet[19],
            "is_retweeted": tweet[20]
        } for tweet in tweets]

        return jsonify({
            "success": True,
            "tweets": formatted_tweets
        })
    except Exception as e:
        print(f"Error fetching tweets: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# 2. Kullanıcı profil bilgilerini getir
@app.route('/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    try:
        # Kullanıcı var mı kontrol et
        cursor.execute('SELECT COUNT(*) FROM "Users" WHERE "UserID" = %s', (user_id,))
        if cursor.fetchone()[0] == 0:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # Kullanıcı bilgilerini getir
        cursor.execute('''
            SELECT 
                u."UserID",
                u."FirstName",
                u."LastName",
                u."Username",
                u."Email",
                u."ProfilePicture",
                COALESCE((SELECT COUNT(*) FROM "Followers" WHERE "FollowingUserID" = u."UserID"), 0) as followers_count,
                COALESCE((SELECT COUNT(*) FROM "Followers" WHERE "FollowerUserID" = u."UserID"), 0) as following_count,
                COALESCE((SELECT COUNT(*) FROM "Tweets" WHERE "UserID" = u."UserID"), 0) as tweets_count
            FROM "Users" u
            WHERE u."UserID" = %s
        ''', (user_id,))
        
        user = cursor.fetchone()
        
        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        user_data = {
            "user_id": user[0],
            "first_name": user[1],
            "last_name": user[2],
            "username": user[3],
            "email": user[4],
            "profile_picture": user[5],
            "followers_count": user[6],
            "following_count": user[7],
            "tweets_count": user[8]
        }

        # Takipçileri getir
        cursor.execute('''
            SELECT 
                u."UserID",
                u."FirstName",
                u."LastName",
                u."Username",
                u."ProfilePicture"
            FROM "Followers" f
            JOIN "Users" u ON f."FollowerUserID" = u."UserID"
            WHERE f."FollowingUserID" = %s
        ''', (user_id,))
        
        followers = cursor.fetchall()
        formatted_followers = []
        for follower in followers:
            formatted_followers.append({
                "user_id": follower[0],
                "first_name": follower[1],
                "last_name": follower[2],
                "username": follower[3],
                "profile_picture": follower[4]
            })

        # Takip edilenleri getir
        cursor.execute('''
            SELECT 
                u."UserID",
                u."FirstName",
                u."LastName",
                u."Username",
                u."ProfilePicture"
            FROM "Followers" f
            JOIN "Users" u ON f."FollowingUserID" = u."UserID"
            WHERE f."FollowerUserID" = %s
        ''', (user_id,))
        
        following = cursor.fetchall()
        formatted_following = []
        for follow in following:
            formatted_following.append({
                "user_id": follow[0],
                "first_name": follow[1],
                "last_name": follow[2],
                "username": follow[3],
                "profile_picture": follow[4]
            })
        
        return jsonify({
            "success": True,
            "user": user_data,
            "followers": formatted_followers,
            "following": formatted_following
        })
        
    except Exception as e:
        print(f"Error fetching user: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Internal server error"
        }), 500

# Kullanıcı Kayıt Endpoint'i
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        print("Received data:", data)  # Debug için

        # Kullanıcı adı veya e-posta kontrolü
        cursor.execute('''
            SELECT COUNT(*) FROM "Users" 
            WHERE "Username" = %s OR "Email" = %s
        ''', (data['username'], data['email']))
        
        if cursor.fetchone()[0] > 0:
            return jsonify({
                "message": "Username or email already exists!"
            }), 400

        # Yeni kullanıcı kaydı
        insert_query = '''
            INSERT INTO "Users" 
            ("FirstName", "LastName", "Username", "Email", "Password")
        VALUES (%s, %s, %s, %s, %s)
            RETURNING "UserID"
        '''
        
        cursor.execute(insert_query, (
            data['first_name'],
            data['last_name'],
            data['username'],
            data['email'],
            data['password']
        ))
        
        user_id = cursor.fetchone()[0]
        conn.commit()
        
        print("User registered successfully with ID:", user_id)  # Debug için
        
        return jsonify({
            "message": "User registered successfully!",
            "user_id": user_id,
            "first_name": data['first_name'],
            "last_name": data['last_name']
        }), 201
        
    except Exception as e:
        print("Registration error:", str(e))  # Debug için
        conn.rollback()
        return jsonify({
            "message": "Registration failed!",
            "error": str(e)
        }), 400

# Kullanıcı Giriş Endpoint'i
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        print(f"Login attempt for email: {email}")  # Debug için

        # Kullanıcıyı bul
        cursor.execute(
            'SELECT "UserID", "Password", "FirstName", "LastName" FROM "Users" WHERE "Email" = %s',
            (email,)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        # Normal şifre kontrolü (bcrypt olmadan)
        if user[1] == password:  # Direkt şifre karşılaştırması
            return jsonify({
                "success": True,
                "message": "Login successful",
                "user_id": user[0],
                "user": {
                    "user_id": user[0],
                    "first_name": user[2],
                    "last_name": user[3]
                }
            })
        else:
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "An error occurred during login"
        }), 500

# Tweet Beğenme Endpoint'i
@app.route('/like_tweet', methods=['POST'])
def like_tweet():
    data = request.json
    user_id = data['user_id']
    tweet_id = data['tweet_id']
    
    try:
        cursor = conn.cursor()
        # Kullanıcının tweet'i daha önce beğenip beğenmediğini kontrol et
        cursor.execute('SELECT * FROM "Likes" WHERE "UserID" = %s AND "TweetID" = %s', 
                      (user_id, tweet_id))
        
        if cursor.fetchone() is None:
            # Beğeni ekle
            cursor.execute('INSERT INTO "Likes" ("UserID", "TweetID") VALUES (%s, %s)',
                         (user_id, tweet_id))
            conn.commit()
            return jsonify({"message": "Tweet liked successfully"}), 200
        else:
            return jsonify({"message": "Tweet already liked"}), 400
            
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400

# Tweet'leri getir (Takip edilenlerin tweetleri)
@app.route('/feed/<int:user_id>', methods=['GET'])
def get_feed(user_id):
    try:
        print(f"\n=== Feed request for user_id: {user_id} ===")
        
        # Tweet'leri getir
        query = '''
            WITH followed_users AS (
                SELECT "FollowingUserID" 
                FROM "Followers" 
                WHERE "FollowerUserID" = %s
            )
            SELECT DISTINCT
                t."TweetID",
                t."Content",
                t."Timestamp",
                u."UserID",
                u."Username",
                u."FirstName",
                u."LastName",
                COALESCE(l.like_count, 0) as like_count,
                COALESCE(c.comment_count, 0) as comment_count,
                EXISTS(SELECT 1 FROM "Likes" WHERE "TweetID" = t."TweetID" AND "UserID" = %s) as user_liked
            FROM "Tweets" t
            JOIN "Users" u ON t."UserID" = u."UserID"
            LEFT JOIN (
                SELECT "TweetID", COUNT(*) as like_count 
                FROM "Likes" 
                GROUP BY "TweetID"
            ) l ON t."TweetID" = l."TweetID"
            LEFT JOIN (
                SELECT "TweetID", COUNT(*) as comment_count 
                FROM "Comments" 
                GROUP BY "TweetID"
            ) c ON t."TweetID" = c."TweetID"
            WHERE t."UserID" IN (SELECT "FollowingUserID" FROM followed_users)
                OR t."UserID" = %s
            ORDER BY t."TweetID" DESC
        '''
        
        cursor.execute(query, (user_id, user_id, user_id))
        
        tweets = cursor.fetchall()
        print(f"Found {len(tweets)} tweets")
        
        formatted_tweets = []
        for tweet in tweets:
            try:
                tweet_data = {
                    "tweet_id": tweet[0],
                    "content": tweet[1],
                    "timestamp": str(tweet[2]) if tweet[2] else None,  # timestamp'i string'e çevir
                    "user_id": tweet[3],
                    "username": tweet[4],
                    "first_name": tweet[5],
                    "last_name": tweet[6],
                    "likes": tweet[7],
                    "comments": tweet[8],
                    "user_liked": tweet[9]
                }
                formatted_tweets.append(tweet_data)
            except Exception as e:
                print(f"Error formatting tweet {tweet[0]}: {str(e)}")
        
        return jsonify(formatted_tweets)
        
    except Exception as e:
        print(f"Error in get_feed: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# Tweet oluştur
@app.route('/tweet', methods=['POST'])
def create_tweet():
    try:
        user_id = request.form.get('user_id')
        content = request.form.get('content')
        image = request.files.get('image')
        
        image_filename = None
        if image and allowed_file(image.filename):
            filename = secure_filename(image.filename)
            image_filename = f"{int(time.time())}_{filename}"
            image.save(os.path.join(TWEET_UPLOAD_FOLDER, image_filename))

        cursor.execute('''
            INSERT INTO "Tweets" ("UserID", "Content", "ImageURL", "Timestamp")
            VALUES (%s, %s, %s, NOW())
            RETURNING "TweetID"
        ''', (user_id, content, image_filename))
        
        tweet_id = cursor.fetchone()[0]
        conn.commit()

        return jsonify({
            "success": True,
            "tweet_id": tweet_id
        })

    except Exception as e:
        print(f"Error creating tweet: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

# Resim servis etmek için yeni endpoint
@app.route('/uploads/tweet_images/<path:filename>')
def serve_tweet_image(filename):
    return send_from_directory(TWEET_UPLOAD_FOLDER, filename)

# Retweet yap
@app.route('/retweet', methods=['POST'])
def retweet():
    try:
        data = request.json
        user_id = data.get('user_id')
        tweet_id = data.get('tweet_id')
        
        if not user_id or not tweet_id:
            return jsonify({
                "success": False,
                "message": "user_id and tweet_id are required"
            }), 400

        # Önce orijinal tweet'i kontrol et
        cursor.execute('''
            SELECT t."TweetID", t."Content", t."UserID", 
                   u."FirstName", u."LastName", u."Username", u."ProfilePicture"
            FROM "Tweets" t
            JOIN "Users" u ON t."UserID" = u."UserID"
            WHERE t."TweetID" = %s
        ''', (tweet_id,))
        
        original_tweet = cursor.fetchone()
        if not original_tweet:
            return jsonify({
                "success": False,
                "message": "Original tweet not found"
            }), 404

        # Kullanıcının bu tweet'i daha önce retweet yapıp yapmadığını kontrol et
        cursor.execute('''
            SELECT "TweetID" FROM "Tweets"
            WHERE "UserID" = %s AND "RetweetID" = %s
        ''', (user_id, tweet_id))
        
        existing_retweet = cursor.fetchone()
        if existing_retweet:
            return jsonify({
                "success": False,
                "message": "Tweet already retweeted"
            }), 400

        # Retweet'i ekle
        cursor.execute('''
            INSERT INTO "Tweets" ("UserID", "RetweetID", "Content", "Timestamp")
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING "TweetID"
        ''', (user_id, tweet_id, original_tweet[1]))
        
        new_tweet = cursor.fetchone()
        
        # Güncel retweet sayısını getir
        cursor.execute('''
            SELECT COUNT(*) FROM "Tweets"
            WHERE "RetweetID" = %s
        ''', (tweet_id,))
        
        retweet_count = cursor.fetchone()[0]
        
        conn.commit()
        
        return jsonify({
            "success": True,
            "message": "Tweet retweeted successfully",
            "tweet": {
                "tweet_id": new_tweet[0],
                "original_tweet_id": tweet_id,
                "original_content": original_tweet[1],
                "original_user_id": original_tweet[2],
                "original_first_name": original_tweet[3],
                "original_last_name": original_tweet[4],
                "original_username": original_tweet[5],
                "original_profile_picture": original_tweet[6],
                "retweet_count": retweet_count
            }
        })
        
    except Exception as e:
        print(f"Error retweeting: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to retweet",
            "error": str(e)
        }), 500

# Yorum yap
@app.route('/comment', methods=['POST'])
def add_comment():
    try:
        data = request.json
        user_id = data.get('user_id')
        tweet_id = data.get('tweet_id')
        content = data.get('content')

        if not all([user_id, tweet_id, content]):
            return jsonify({
                "success": False,
                "message": "Missing required fields"
            }), 400

        # Yeni yorum ekle
        cursor.execute('''
            INSERT INTO "Comments" ("UserID", "TweetID", "Content")
            VALUES (%s, %s, %s)
            RETURNING "CommentID", "Timestamp"
        ''', (user_id, tweet_id, content))
        
        result = cursor.fetchone()
        comment_id, timestamp = result
        
        # Yorum bilgilerini al
        cursor.execute('''
            SELECT 
                c."CommentID",
                c."Content",
                c."Timestamp",
                u."FirstName",
                u."LastName",
                u."Username"
            FROM "Comments" c
            JOIN "Users" u ON c."UserID" = u."UserID"
            WHERE c."CommentID" = %s
        ''', (comment_id,))

        comment = cursor.fetchone()
        conn.commit()

        return jsonify({
            "success": True,
            "comment": {
                "comment_id": comment[0],
                "content": comment[1],
                "timestamp": comment[2].strftime('%Y-%m-%d %H:%M:%S'),
                "first_name": comment[3],
                "last_name": comment[4],
                "username": comment[5]
            }
        })

    except Exception as e:
        print(f"Error adding comment: {str(e)}")
        conn.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to add comment",
            "error": str(e)
        }), 500

# Tweet'in yorumlarını getir
@app.route('/comments/<int:tweet_id>', methods=['GET'])
def get_comments(tweet_id):
    try:
        cursor.execute('''
            SELECT 
                c."CommentID",
                c."Content",
                c."Timestamp",
                c."UserID",
                u."FirstName",
                u."LastName",
                u."Username",
                u."ProfilePicture"
            FROM "Comments" c
            JOIN "Users" u ON c."UserID" = u."UserID"
            WHERE c."TweetID" = %s
            ORDER BY c."Timestamp" DESC
        ''', (tweet_id,))
        
        comments = cursor.fetchall()
        
        formatted_comments = [{
            "comment_id": comment[0],
            "content": comment[1],
            "timestamp": comment[2].strftime('%Y-%m-%d %H:%M:%S'),
            "user_id": comment[3],
            "first_name": comment[4],
            "last_name": comment[5],
            "username": comment[6],
            "profile_picture": comment[7]
        } for comment in comments]
        
        return jsonify(formatted_comments)
        
    except Exception as e:
        print(f"Error fetching comments: {str(e)}")
        return jsonify([])

# Kullanıcıyı takip et
@app.route('/follow', methods=['POST'])
def follow():
    try:
        data = request.json
        follower_id = data['follower_id']
        following_id = data['following_id']

        # Önce mevcut takip durumunu kontrol et
        cursor.execute('''
            SELECT EXISTS(
                SELECT 1 FROM "Followers" 
                WHERE "FollowerUserID" = %s AND "FollowingUserID" = %s
            )
        ''', (follower_id, following_id))
        
        is_following = cursor.fetchone()[0]

        if is_following:
            # Takipten çık
            cursor.execute('''
                DELETE FROM "Followers"
                WHERE "FollowerUserID" = %s AND "FollowingUserID" = %s
            ''', (follower_id, following_id))
        else:
            # Takip et
            cursor.execute('''
                INSERT INTO "Followers" ("FollowerUserID", "FollowingUserID")
                VALUES (%s, %s)
            ''', (follower_id, following_id))

        conn.commit()

        return jsonify({
            "success": True,
            "is_following": not is_following  # Yeni takip durumunu döndür
        })

    except Exception as e:
        print(f"Error in follow operation: {str(e)}")
        conn.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Kullanıcı Çıkış Endpoint'i
@app.route('/logout', methods=['POST'])
def logout():
    try:
        # Frontend'den gelen user_id'yi al
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required"
            }), 400

        # Başarılı çıkış
        return jsonify({
            "success": True,
            "message": "Logout successful!"
        }), 200
        
    except Exception as e:
        print("Logout error:", str(e))
        return jsonify({
            "success": False,
            "message": "Logout failed!",
            "error": str(e)
        }), 500

# Takip ilişkisini kontrol et
@app.route('/check_follow/<int:follower_id>/<int:following_id>', methods=['GET'])
def check_follow(follower_id, following_id):
    try:
        cursor.execute('''
            SELECT EXISTS(
                SELECT 1 
                FROM "Followers" 
                WHERE "FollowerUserID" = %s AND "FollowingUserID" = %s
            )
        ''', (follower_id, following_id))
        
        is_following = cursor.fetchone()[0]
        return jsonify({"is_following": is_following})
    except Exception as e:
        print(f"Error in check_follow: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Tweet beğen/beğenmekten vazgeç
@app.route('/toggle_like', methods=['POST'])
def toggle_like():
    try:
        data = request.json
        user_id = data['user_id']
        tweet_id = data['tweet_id']
        
        print(f"Toggle like request - User: {user_id}, Tweet: {tweet_id}")  # Debug log

        # Önce tweet'in var olduğunu kontrol et
        cursor.execute('SELECT 1 FROM "Tweets" WHERE "TweetID" = %s', (tweet_id,))
        if not cursor.fetchone():
            return jsonify({"error": "Tweet not found"}), 404

        # Beğeni durumunu kontrol et
        cursor.execute('''
            SELECT EXISTS(
                SELECT 1 FROM "Likes" 
                WHERE "UserID" = %s AND "TweetID" = %s
            )
        ''', (user_id, tweet_id))
        
        already_liked = cursor.fetchone()[0]
        print(f"Already liked: {already_liked}")  # Debug log
        
        try:
            if already_liked:
                # Beğeniyi kaldır
                cursor.execute('''
                    DELETE FROM "Likes" 
                    WHERE "UserID" = %s AND "TweetID" = %s
                ''', (user_id, tweet_id))
                liked = False
            else:
                # Beğeni ekle
                cursor.execute('''
                    INSERT INTO "Likes" ("UserID", "TweetID") 
                    VALUES (%s, %s)
                ''', (user_id, tweet_id))
                liked = True
                
            conn.commit()
            print(f"Like operation successful. New state: {liked}")  # Debug log
            
            # Güncel beğeni sayısını al
            cursor.execute('SELECT COUNT(*) FROM "Likes" WHERE "TweetID" = %s', (tweet_id,))
            like_count = cursor.fetchone()[0]
            
            return jsonify({
                "success": True,
                "liked": liked,
                "like_count": like_count
            }), 200
            
        except psycopg2.Error as db_error:
            conn.rollback()
            print(f"Database error details: {db_error.pgerror}")  # Detaylı hata mesajı
            return jsonify({"error": "Database operation failed", "details": str(db_error.pgerror)}), 500
            
    except Exception as e:
        print(f"Unexpected error in toggle_like: {str(e)}")
        traceback.print_exc()  # Tam hata stack'ini yazdır
        return jsonify({"error": "Internal server error"}), 500

@app.route('/follow_stats/<int:user_id>', methods=['GET'])
@error_handler
def get_follow_stats(user_id):
    try:
        # Takipçileri al
        cursor.execute('''
            SELECT 
                u."UserID",
                u."FirstName",
                u."LastName",
                u."Username"
            FROM "Users" u
            JOIN "Followers" f ON f."FollowerUserID" = u."UserID"
            WHERE f."FollowingUserID" = %s
        ''', (user_id,))
        
        followers = [{
            "user_id": row[0],
            "first_name": row[1],
            "last_name": row[2],
            "username": row[3]
        } for row in cursor.fetchall()]

        # Takip edilenleri al
        cursor.execute('''
            SELECT 
                u."UserID",
                u."FirstName",
                u."LastName",
                u."Username"
            FROM "Users" u
            JOIN "Followers" f ON f."FollowingUserID" = u."UserID"
            WHERE f."FollowerUserID" = %s
        ''', (user_id,))
        
        following = [{
            "user_id": row[0],
            "first_name": row[1],
            "last_name": row[2],
            "username": row[3]
        } for row in cursor.fetchall()]

        response = jsonify({
            "success": True,
            "followers": followers,
            "following": following
        })
        
        # CORS başlıklarını ekle
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    except Exception as e:
        print(f"Error fetching follow stats: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch follow stats",
            "error": str(e)
        }), 500

@app.route('/tweets', methods=['GET'])
def get_tweets():
    try:
        user_id = request.args.get('user_id')
        cursor.execute('''
            WITH tweet_stats AS (
                SELECT 
                    t."TweetID",
                    COUNT(DISTINCT l."UserID") as likes,
                    COUNT(DISTINCT c."CommentID") as comments,
                    COUNT(DISTINCT rt."TweetID") as retweets
                FROM "Tweets" t
                LEFT JOIN "Likes" l ON t."TweetID" = l."TweetID"
                LEFT JOIN "Comments" c ON t."TweetID" = c."TweetID"
                LEFT JOIN "Tweets" rt ON t."TweetID" = rt."RetweetID"
                GROUP BY t."TweetID"
            )
            SELECT 
                t."TweetID",
                t."Content",
                t."Timestamp",
                t."ImageURL",
                u."FirstName",
                u."LastName",
                u."Username",
                u."ProfilePicture",
                t."UserID",
                COALESCE(ts.likes, 0) as likes,
                COALESCE(ts.comments, 0) as comments,
                COALESCE(ts.retweets, 0) as retweet_count,
                t."RetweetID",
                ou."UserID" as original_user_id,
                ou."FirstName" as original_first_name,
                ou."LastName" as original_last_name,
                ou."Username" as original_username,
                ou."ProfilePicture" as original_profile_picture,
                ot."Content" as original_content,
                EXISTS(
                    SELECT 1 FROM "Likes" 
                    WHERE "TweetID" = t."TweetID" AND "UserID" = %s
                ) as user_liked,
                EXISTS(
                    SELECT 1 FROM "Tweets" rt 
                    WHERE rt."RetweetID" = t."TweetID" AND rt."UserID" = %s
                ) as is_retweeted
            FROM "Tweets" t
            JOIN "Users" u ON t."UserID" = u."UserID"
            LEFT JOIN tweet_stats ts ON t."TweetID" = ts."TweetID"
            LEFT JOIN "Tweets" ot ON t."RetweetID" = ot."TweetID"
            LEFT JOIN "Users" ou ON ot."UserID" = ou."UserID"
            WHERE t."UserID" IN (
                SELECT "FollowingUserID" 
                FROM "Followers" 
                WHERE "FollowerUserID" = %s
            ) OR t."UserID" = %s
            ORDER BY t."Timestamp" DESC
        ''', (user_id, user_id, user_id, user_id))
        
        tweets = cursor.fetchall()
        
        formatted_tweets = [{
            "tweet_id": tweet[0],
            "content": tweet[1],
            "timestamp": tweet[2].strftime('%Y-%m-%d %H:%M:%S'),
            "image_url": tweet[3],
            "first_name": tweet[4],
            "last_name": tweet[5],
            "username": tweet[6],
            "profile_picture": tweet[7],
            "user_id": tweet[8],
            "likes": tweet[9],
            "comments": tweet[10],
            "retweet_count": tweet[11],
            "is_retweet": tweet[12] is not None,
            "RetweetID": tweet[12],
            "original_user_id": tweet[13],
            "original_first_name": tweet[14],
            "original_last_name": tweet[15],
            "original_username": tweet[16],
            "original_profile_picture": tweet[17],
            "original_content": tweet[18],
            "user_liked": tweet[19],
            "is_retweeted": tweet[20]
        } for tweet in tweets]
        
        return jsonify({
            "success": True,
            "tweets": formatted_tweets
        })
        
    except Exception as e:
        print(f"Error fetching tweets: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

# Kullanıcı arama endpoint'i
@app.route('/search_users', methods=['GET'])
def search_users():
    try:
        search_term = request.args.get('term', '')
        current_user_id = request.args.get('current_user_id')
        
        if not search_term:
            return jsonify([])
            
        cursor.execute('''
            SELECT 
                "UserID",
                "FirstName",
                "LastName",
                "Username",
                "ProfilePicture",
                EXISTS(
                    SELECT 1 FROM "Followers" 
                    WHERE "FollowerUserID" = %s AND "FollowingUserID" = "Users"."UserID"
                ) as is_following
            FROM "Users"
            WHERE LOWER("Username") LIKE LOWER(%s)
            OR LOWER("FirstName") LIKE LOWER(%s)
            OR LOWER("LastName") LIKE LOWER(%s)
            LIMIT 10
        ''', (current_user_id, f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
        
        users = cursor.fetchall()
        
        formatted_users = [{
            "user_id": user[0],
            "first_name": user[1],
            "last_name": user[2],
            "username": user[3],
            "profile_picture": user[4],
            "is_following": user[5]
        } for user in users]
        
        return jsonify(formatted_users)
        
    except Exception as e:
        print(f"Error searching users: {str(e)}")
        return jsonify([])

# Keşfet tweet'lerini getir
@app.route('/explore_tweets/<int:user_id>', methods=['GET'])
def get_explore_tweets(user_id):
    try:
        cursor.execute('''
            SELECT 
                t."TweetID",
                t."Content",
                t."Timestamp",
                u."FirstName",
                u."LastName",
                u."Username",
                u."ProfilePicture",
                u."UserID",
                (SELECT COUNT(*) FROM "Likes" WHERE "TweetID" = t."TweetID") as likes,
                (SELECT COUNT(*) FROM "Comments" WHERE "TweetID" = t."TweetID") as comments,
                (SELECT COUNT(*) FROM "Tweets" WHERE "RetweetID" = t."TweetID") as retweet_count,
                t."RetweetID",
                ou."UserID" as original_user_id,
                ou."FirstName" as original_first_name,
                ou."LastName" as original_last_name,
                ou."Username" as original_username,
                ou."ProfilePicture" as original_profile_picture,
                ot."Content" as original_content,
                EXISTS(
                    SELECT 1 FROM "Likes" 
                    WHERE "TweetID" = t."TweetID" AND "UserID" = %s
                ) as user_liked,
                EXISTS(
                    SELECT 1 FROM "Tweets" rt 
                    WHERE rt."RetweetID" = t."TweetID" AND rt."UserID" = %s
                ) as is_retweeted
            FROM "Tweets" t
            JOIN "Users" u ON t."UserID" = u."UserID"
            LEFT JOIN "Tweets" ot ON t."RetweetID" = ot."TweetID"
            LEFT JOIN "Users" ou ON ot."UserID" = ou."UserID"
            WHERE t."UserID" NOT IN (
                SELECT "FollowingUserID" 
                FROM "Followers" 
                WHERE "FollowerUserID" = %s
            )
            AND t."UserID" != %s
            ORDER BY t."Timestamp" DESC
            LIMIT 50
        ''', (user_id, user_id, user_id, user_id))
        
        tweets = cursor.fetchall()
        
        formatted_tweets = [{
            "tweet_id": tweet[0],
            "content": tweet[1],
            "timestamp": tweet[2].strftime('%Y-%m-%d %H:%M:%S'),
            "first_name": tweet[3],
            "last_name": tweet[4],
            "username": tweet[5],
            "profile_picture": tweet[6],
            "user_id": tweet[7],
            "likes": tweet[8],
            "comments": tweet[9],
            "retweet_count": tweet[10],
            "is_retweet": tweet[11] is not None,
            "RetweetID": tweet[11],
            "original_user_id": tweet[12],
            "original_first_name": tweet[13],
            "original_last_name": tweet[14],
            "original_username": tweet[15],
            "original_profile_picture": tweet[16],
            "original_content": tweet[17],
            "user_liked": tweet[18],
            "is_retweeted": tweet[19]
        } for tweet in tweets]
        
        return jsonify({"success": True, "tweets": formatted_tweets})
        
    except Exception as e:
        print(f"Error fetching explore tweets: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/check_follow_status', methods=['GET'])
def check_follow_status():
    try:
        follower_id = request.args.get('follower_id')
        following_id = request.args.get('following_id')
        
        if not follower_id or not following_id:
            return jsonify({
                "success": False,
                "message": "follower_id and following_id are required",
                "is_following": False
            })

        # String'den int'e dönüştür
        follower_id = int(follower_id)
        following_id = int(following_id)
        
        cursor.execute('''
            SELECT EXISTS(
                SELECT 1 FROM "Followers" 
                WHERE "FollowerUserID" = %s AND "FollowingUserID" = %s
            )
        ''', (follower_id, following_id))
        
        is_following = cursor.fetchone()[0]
        
        return jsonify({
            "success": True,
            "is_following": is_following
        })
        
    except Exception as e:
        print(f"Error checking follow status: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e),
            "is_following": False
        })

# Retweet geri alma endpoint'i
@app.route('/undo_retweet', methods=['POST'])
def undo_retweet():
    try:
        data = request.json
        user_id = data.get('user_id')
        tweet_id = data.get('tweet_id')

        # Önce retweet'in ID'sini bulalım
        cursor.execute('''
            SELECT "TweetID" 
            FROM "Tweets" 
            WHERE "UserID" = %s AND "RetweetID" = %s
        ''', (user_id, tweet_id))
        
        retweet = cursor.fetchone()
        if not retweet:
            return jsonify({
                "success": False,
                "message": "Retweet not found"
            }), 404

        retweet_id = retweet[0]

        # Önce bu retweet'e ait yorumları silelim
        cursor.execute('DELETE FROM "Comments" WHERE "TweetID" = %s', (retweet_id,))
        
        # Sonra retweet'i silelim
        cursor.execute('DELETE FROM "Tweets" WHERE "TweetID" = %s', (retweet_id,))
        
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Retweet successfully undone"
        })

    except Exception as e:
        print(f"Error undoing retweet: {str(e)}")
        conn.rollback()
        return jsonify({
            "success": False,
            "message": "Failed to undo retweet"
        }), 500

# Tweet silme endpoint'i
@app.route('/delete_tweet', methods=['POST'])
def delete_tweet():
    try:
        data = request.json
        user_id = data.get('user_id')
        tweet_id = data.get('tweet_id')
        
        if not user_id or not tweet_id:
            return jsonify({
                "success": False,
                "message": "user_id and tweet_id are required"
            }), 400
            
        # İşlemleri transaction içinde yap
        cursor.execute('BEGIN')
        try:
            # Tweet'i ve sahibini kontrol et
            cursor.execute('''
                SELECT "RetweetID", "UserID" FROM "Tweets" 
                WHERE "TweetID" = %s
            ''', (tweet_id,))
            
            result = cursor.fetchone()
            if not result:
                cursor.execute('ROLLBACK')
                return jsonify({
                    "success": False,
                    "message": "Tweet not found"
                }), 404

            # Tweet'in sahibi veya retweet yapan kişi mi kontrol et
            if result[1] != user_id:
                cursor.execute('ROLLBACK')
                return jsonify({
                    "success": False,
                    "message": "Unauthorized to delete this tweet"
                }), 403
                
            # Eğer bu bir retweet ise
            if result[0] is not None:
                # Sadece retweet'i sil
                cursor.execute('''
                    DELETE FROM "Tweets"
                    WHERE "TweetID" = %s
                ''', (tweet_id,))
            else:
                # Orijinal tweet ise, önce bağımlı verileri sil
                # 1. Yorumları sil
                cursor.execute('DELETE FROM "Comments" WHERE "TweetID" = %s', (tweet_id,))
                
                # 2. Beğenileri sil
                cursor.execute('DELETE FROM "Likes" WHERE "TweetID" = %s', (tweet_id,))
                
                # 3. Bu tweet'in retweetlerini sil
                cursor.execute('DELETE FROM "Tweets" WHERE "RetweetID" = %s', (tweet_id,))
                
                # 4. En son tweet'i sil
                cursor.execute('DELETE FROM "Tweets" WHERE "TweetID" = %s', (tweet_id,))
            
            # Transaction'ı tamamla
            cursor.execute('COMMIT')
            
            return jsonify({
                "success": True,
                "message": "Tweet deleted successfully"
            })
            
        except Exception as e:
            cursor.execute('ROLLBACK')
            raise e
            
    except Exception as e:
        print(f"Error deleting tweet: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to delete tweet",
            "error": str(e)
        }), 500

# Profil resimlerini servis etmek için yeni endpoint
@app.route('/uploads/profile_pictures/<path:filename>')
def serve_profile_picture(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Mevcut upload_profile_picture fonksiyonunu güncelle
@app.route('/upload_profile_picture', methods=['POST', 'OPTIONS'])
def upload_profile_picture():
    if request.method == 'OPTIONS':
        return jsonify({"success": True})
        
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file part'}), 400
            
        file = request.files['file']
        user_id = request.form.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID is required'}), 400
            
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No selected file'}), 400
            
        if file and allowed_file(file.filename):
            # Dosya adını güvenli hale getir
            filename = secure_filename(f"user_{user_id}_{file.filename}")
            
            # Uploads klasörünü oluştur
            if not os.path.exists(app.config['UPLOAD_FOLDER']):
                os.makedirs(app.config['UPLOAD_FOLDER'])
            
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            # Eski profil resmini sil
            cursor.execute('SELECT "ProfilePicture" FROM "Users" WHERE "UserID" = %s', (user_id,))
            old_picture = cursor.fetchone()
            if old_picture and old_picture[0]:
                old_filepath = os.path.join(app.config['UPLOAD_FOLDER'], old_picture[0])
                if os.path.exists(old_filepath):
                    os.remove(old_filepath)
            
            # Yeni resmi kaydet
            file.save(filepath)
            
            # Veritabanını güncelle
            cursor.execute(
                'UPDATE "Users" SET "ProfilePicture" = %s WHERE "UserID" = %s',
                (filename, user_id)
            )
            conn.commit()
            
            return jsonify({
                'success': True,
                'message': 'Profile picture updated successfully',
                'filename': filename
            })
            
    except Exception as e:
        print(f"Error uploading profile picture: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/tweet/<int:tweet_id>', methods=['GET'])
def get_tweet(tweet_id):
    try:
        user_id = request.args.get('user_id', type=int)
        
        if not user_id:
            return jsonify({
                "success": False,
                "message": "User ID is required"
            }), 400

        cursor.execute('''
            SELECT 
                t."TweetID",
                t."Content",
                t."Timestamp",
                u."UserID",
                u."FirstName",
                u."LastName",
                u."Username",
                u."ProfilePicture",
                (SELECT COUNT(*) FROM "Likes" WHERE "TweetID" = t."TweetID") as likes,
                (SELECT COUNT(*) FROM "Comments" WHERE "TweetID" = t."TweetID") as comments,
                (SELECT COUNT(*) FROM "Tweets" rt WHERE rt."RetweetID" = t."TweetID") as retweet_count,
                EXISTS(
                    SELECT 1 FROM "Likes" 
                    WHERE "TweetID" = t."TweetID" AND "UserID" = %s
                ) as user_liked,
                EXISTS(
                    SELECT 1 FROM "Tweets" rt 
                    WHERE rt."RetweetID" = t."TweetID" AND rt."UserID" = %s
                ) as is_retweeted,
                t."RetweetID",
                ou."UserID" as original_user_id,
                ou."FirstName" as original_first_name,
                ou."LastName" as original_last_name,
                ou."Username" as original_username,
                ou."ProfilePicture" as original_profile_picture,
                ot."Content" as original_content
            FROM "Tweets" t
            JOIN "Users" u ON t."UserID" = u."UserID"
            LEFT JOIN "Tweets" ot ON t."RetweetID" = ot."TweetID"
            LEFT JOIN "Users" ou ON ot."UserID" = ou."UserID"
            WHERE t."TweetID" = %s
        ''', (user_id, user_id, tweet_id))
        
        tweet = cursor.fetchone()
        
        if not tweet:
            return jsonify({
                "success": False,
                "message": "Tweet not found"
            }), 404

        formatted_tweet = {
            "tweet_id": tweet[0],
            "content": tweet[1],
            "timestamp": tweet[2].strftime('%Y-%m-%d %H:%M:%S'),
            "user_id": tweet[3],
            "first_name": tweet[4],
            "last_name": tweet[5],
            "username": tweet[6],
            "profile_picture": tweet[7],
            "likes": tweet[8],
            "comments": tweet[9],
            "retweet_count": tweet[10],
            "user_liked": tweet[11],
            "is_retweeted": tweet[12],
            "is_retweet": tweet[13] is not None,
            "RetweetID": tweet[13],
            "original_user_id": tweet[14],
            "original_first_name": tweet[15],
            "original_last_name": tweet[16],
            "original_username": tweet[17],
            "original_profile_picture": tweet[18],
            "original_content": tweet[19]
        }
        
        return jsonify({
            "success": True,
            "tweet": formatted_tweet
        })
        
    except Exception as e:
        print(f"Error fetching tweet: {str(e)}")
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

