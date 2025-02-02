""" 4CAT configuration """
import os
import configparser

DOCKER_CONFIG_FILE = 'config/docker_config.ini'

# Data source configuration
DATASOURCES = {
    "4chan": {  # should correspond to PLATFORM in the data source's __init__.py
        "interval": 60,  # scrape interval for boards
        "boards": ["pol", "b", "v"],  # boards to scrape (and generally make available)
        "no_scrape": ["b"]
    },
    "8chan": {
        "interval": 60,
        "boards": ["pol", "v", "leftypol", "brit"],
    },
    "reddit": {
        "boards": "*",
    },
    "tumblr": {
        "expire-datasets": 255600 # Three days - required by the Tumblr API
    },
    "breitbart": {},
    "stash": {},
    "tiktok": {},
    "theguardian": {},
    "parliaments": {},
    "instagram": {},
    "customimport": {},
    "custom": {},
    "telegram": {},
    "8kun": {"boards": ["pnd", "v", "brit", "qresearch", "qpatriotresearch", "qresearch2gen"], "interval": 300},
    "twitterv2": {},
    "douban": {},
    "parler": {},
    "bitchute": {}
}


#####################
# Processor Options #
#####################

# download_images.py
MAX_NUMBER_IMAGES = 1000

# YouTube variables to use for processors
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"
YOUTUBE_DEVELOPER_KEY = ""

# Tumblr API keys to use for data capturing
TUMBLR_CONSUMER_KEY = ""
TUMBLR_CONSUMER_SECRET_KEY = ""
TUMBLR_API_KEY = ""
TUMBLR_API_SECRET_KEY = ""

# Reddit API keys
REDDIT_API_CLIENTID = ""
REDDIT_API_SECRET = ""

# tcat_auto_upload.py
TCAT_SERVER = ''
TCAT_TOKEN = ''
TCAT_USERNAME = ''
TCAT_PASSWORD = ''

# pix_plot.py
# If you host a version of https://github.com/digitalmethodsinitiative/dmi_pix_plot, you can use a processor to publish
# downloaded images into a PixPlot there
PIXPLOT_SERVER = ""

########################
# 4CAT General Options #
########################

# Configure how the tool is to be named in its web interface. The backend will
# always refer to '4CAT' - the name of the software, and a 'powered by 4CAT'
# notice may also show up in the web interface regardless of the value entered here.
TOOL_NAME = "4CAT"
TOOL_NAME_LONG = "4CAT: Capture and Analysis Toolkit"

# Postgres login details
DB_HOST = "localhost"
DB_PORT = 5432
DB_USER = "fourcat"
DB_NAME = "fourcat"
DB_PASSWORD = "supers3cr3t"

# Path to folders where logs/images/data may be saved.
# Paths are relative to the folder this config file is in.
PATH_ROOT = os.path.abspath(os.path.dirname(__file__))  # better don't change this
PATH_LOGS = ""  # store logs here - empty means the 4CAT root folder
PATH_IMAGES = ""  # if left empty or pointing to a non-existent folder, no images will be saved
PATH_DATA = ""  # search results will be stored here as CSV files
PATH_LOCKFILE = "backend"  # the daemon lockfile will be saved in this folder. Probably no need to change!
PATH_SESSIONS = "sessions" # folder where API session data is stored (e.g., Telegram)

# The following two options should be set to ensure that every analysis step can
# be traced to a specific version of 4CAT. This allows for reproducible
# research. You can however leave them empty with no ill effect. The version ID
# should be a commit hash, which will be combined with the Github URL to offer
# links to the exact version of 4CAT code that produced an analysis result.
# If no version file is available, the output of "git show" in PATH_ROOT will be used
# to determine the version, if possible.
PATH_VERSION = ".git-checked-out"  # file containing a commit ID (everything after the first whitespace found is ignored)
GITHUB_URL = "https://github.com/digitalmethodsinitiative/4cat"  # URL to the github repository for this 4CAT instance

# These settings control whether top-level datasets (i.e. those created via the
# 'Create dataset' page) are deleted automatically, and if so, after how much
# time. You can also allow users to cancel this (i.e. opt out). Note that if
# users are allowed to opt out, data sources can still force the expiration of
# datasets created through that data source. This cannot be overridden by the
# user.
EXPIRE_DATASETS = 0  # 0 or False-y to not expire
EXPIRE_ALLOW_OPTOUT = True  # allow users to opt out of expiration

# 4CAT has an API (available from localhost) that can be used for monitoring
# and will listen for requests on the following port. "0" disables the API.
API_HOST = "localhost"
API_PORT = 4444

# 4CAT can anonymise author names in results and does so using a hashed version
# of the author name + a salt. The salt should be defined here. This should be
# a random string; in Python you can generate one with e.g. bcrypt.gensalt()
# You need to set this before running 4CAT. 4CAT will refuse to run if this is
# left at its default value.
ANONYMISATION_SALT = b'$2b$12$ZrmiwqLqjJm/7jpDv5PERe'

# Warning report configuration
WARN_INTERVAL = 600  # every so many seconds, compile a report of logged warnings and e-mail it to admins
WARN_LEVEL = "WARNING"  # only alerts above this level are mailed: DEBUG/INFO/WARNING/ERROR/CRITICAL
WARN_SLACK_URL = ""  # A Slack callback URL may be entered here; any warnings equal to or above
				     # WARN_LEVEL will be sent there immediately

# E-mail settings
# If your SMTP server requires login, define the MAIL_USERNAME and
# MAIL_PASSWORD variables here additionally.
WARN_EMAILS = []  # e-mail addresses to send warning reports to
ADMIN_EMAILS = []  # e-mail of admins, to send account requests etc to
MAILHOST = "localhost" # SMTP server to connect to for sending e-mail alerts.
MAIL_SSL = False  # use SSL to connect to e-mail server?
MAIL_USERNAME = ""
MAIL_PASSWORD = ""
NOREPLY_EMAIL = "noreply@localhost"

# Scrape settings for data sources that contain their own scrapers
SCRAPE_TIMEOUT = 5  # how long to wait for a scrape request to finish?
SCRAPE_PROXIES = {"http": []}  # Items in this list should be formatted like "http://111.222.33.44:1234"
IMAGE_INTERVAL = 3600

# Explorer settings
MAX_EXPLORER_POSTS = 100000
EXPLORER_POSTS_ON_PAGE = 50

# Web tool settings
class FlaskConfig:
    FLASK_APP = 'webtool/fourcat'
    SECRET_KEY = b'Z<JK\x12\xd1\x19xQ\x072\xc6'
    SERVER_NAME = 'localhost:5000' # if using a port other than 80, change to localhost:specific_port
    SERVER_HTTPS = False  # set to true to make 4CAT use "https" in absolute URLs
    HOSTNAME_WHITELIST = ["localhost"]  # only these may access the web tool; "*" or an empty list matches everything
    HOSTNAME_WHITELIST_API = ["localhost"]  # hostnames matching these are exempt from rate limiting
    HOSTNAME_WHITELIST_NAME = "Automatic login"

##########
# DOCKER #
##########
# Docker setup requires matching configuration for the following values

# These values will overwrite anything set previously in this config and
# originate from the .env file or the docker_config.ini file

if os.path.exists(DOCKER_CONFIG_FILE):
  config = configparser.ConfigParser()
  config.read(DOCKER_CONFIG_FILE)
  if config['DOCKER'].getboolean('use_docker_config'):
      # can be your server url or ip
      your_server = config['SERVER'].get('server_name', 'localhost')

      DB_HOST = config['DATABASE'].get('db_host')
      DB_PORT = config['DATABASE'].getint('db_port')
      DB_USER = config['DATABASE'].get('db_user')
      DB_NAME = config['DATABASE'].get('db_name')
      DB_PASSWORD = config['DATABASE'].get('db_password')

      API_HOST = config['API'].get('api_host')
      API_PORT = config['API'].getint('api_port')

      PATH_ROOT = os.path.abspath(os.path.dirname(__file__))  # better don't change this
      PATH_LOGS = config['PATHS'].get('path_logs', "")
      PATH_IMAGES = config['PATHS'].get('path_images', "")
      PATH_DATA = config['PATHS'].get('path_data', "")
      PATH_LOCKFILE = config['PATHS'].get('path_lockfile', "")
      PATH_SESSIONS = config['PATHS'].get('path_sessions', "")

      ANONYMISATION_SALT = config['GENERATE'].get('anonymisation_salt')

      class FlaskConfig:
          FLASK_APP = 'webtool/fourcat'
          SECRET_KEY = config['GENERATE'].get('secret_key')
          if config['SERVER'].getint('public_port') == 80:
              SERVER_NAME = your_server
          else:
              SERVER_NAME = f"{your_server}:{config['SERVER'].get('public_port')}"
          SERVER_HTTPS = False  # set to true to make 4CAT use "https" in absolute URLs; DOES NOT CURRENTLY WORK WITH DOCKER SETUP
          HOSTNAME_WHITELIST = ["localhost", your_server]  # only these may access the web tool; "*" or an empty list matches everything
          HOSTNAME_WHITELIST_API = ["localhost", your_server]  # hostnames matching these are exempt from rate limiting
          HOSTNAME_WHITELIST_NAME = "Automatic login"
