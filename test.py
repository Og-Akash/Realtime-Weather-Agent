from sklearn.feature_extraction.text import CountVectorizer
# Sample documents
documents = [
    "The cat sat on the mat.",
"The dog sat on the log."
"Cats and dogs are pets."
]
# Initialize Countvectorizer
vectorizer = CountVectorizer()
X = vectorizer.fit_transform(documents)
# Convert to array and print
print (X.toarray())
print (vectorizer. get_feature_names_out ( ) )