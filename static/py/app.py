# Import dependencies
import pandas as pd
import sqlite3
import os
import json
from flask import Flask, jsonify
from flask_cors import CORS  # For handling cross-origin requests

# File paths
csv_file = "../../Data/processed_data.csv"  # Path to your processeod_data.csv
heatmap_file = "../../Data/heatmap.csv"  # Path to your heatmap.csv
sqlite_file = "../../Data/movies_analysis.sqlite"  # Path to SQLite database

# Create the output directory if it doesn’t exist
os.makedirs(os.path.dirname(sqlite_file), exist_ok=True)

# Table names
movies_table_name = "movies"
heatmap_table_name = "heatmap_data"

# Function to load CSV data into SQLite
def load_csv_to_sqlite():
    """Reads CSV data and writes it to an SQLite database."""
    try:
        # Connect to SQLite database (this will create the file if it doesn't exist)
        conn = sqlite3.connect(sqlite_file)

        # Import processed_data.csv
        processed_data_df = pd.read_csv(csv_file)
        processed_data_df.to_sql(movies_table_name, conn, if_exists='replace', index=False)

        # Import heatmap.csv
        heatmap_df = pd.read_csv(heatmap_file)
        heatmap_df.to_sql(heatmap_table_name, conn, if_exists='replace', index=False)

        # Determine if the file exists
        print("CSV files have been successfully written to SQLite database.")
    except Exception as e:
        print(f"An error occurred while loading CSV to SQLite: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
            print("SQLite connection closed.")

# Load data into SQLite when the script runs
load_csv_to_sqlite()

# Flask app setup
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def get_movie_data():
    """Fetches movie data from the SQLite database."""
    try:
        conn = sqlite3.connect(sqlite_file)
        query = """
        SELECT id, title, year, nominations, production_companies, 
               votes, rating, budget, gross_world_wide, gross_us_canada, genres 
        FROM movies
        """
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient='records')
    except Exception as e:
        print(f"Error fetching movie data: {e}")
        return []
    finally:
        if 'conn' in locals():
            conn.close()

def get_heatmap_data():
    """Fetches heatmap data from the SQLite database."""
    try:
        conn = sqlite3.connect(sqlite_file)
        query = "SELECT * FROM heatmap_data"
        df = pd.read_sql_query(query, conn)
        return df.to_dict(orient='records')
    except Exception as e:
        print(f"Error fetching heatmap data: {e}")
        return []
    finally:
        if 'conn' in locals():
            conn.close()


# Create the flask routes that app.js will use to retrieve data
@app.route('/get-movies', methods=['GET'])
def get_movies():
    """API endpoint to get movie data."""
    movie_data = get_movie_data()
    return jsonify(movie_data)

@app.route('/get-heatmap', methods=['GET'])
def get_heatmap():
    """API endpoint to get heatmap data."""
    heatmap_data = get_heatmap_data()
    return jsonify(heatmap_data)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
